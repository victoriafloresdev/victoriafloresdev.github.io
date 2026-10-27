"""Turn the AI-generated sprite art in art-src/ into clean, game-ready pixel art.

The source images are ~9-10 screen pixels per art pixel, with soft alpha edges
and colour fringes. For each sheet we:
  1. split it into cells and crop each sprite to its opaque bounding box;
  2. downscale with premultiplied-alpha box filtering to the real pixel grid,
     using ONE scale per sheet so frames don't change size;
  3. snap alpha to 0/255 and quantise colours to a shared palette;
  4. add a 1px dark outline so sprites read well on a dark scene;
  5. pack the frames into a horizontal strip, anchored bottom-centre.

Run:  python scripts/process_sprites.py
Out:  public/sprites/*.png and public/sprites/sprites.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art-src"
OUT = ROOT / "public" / "sprites"
OUT.mkdir(parents=True, exist_ok=True)

OUTLINE = (26, 16, 22, 255)


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGBA")).astype(np.float32) / 255.0


def opaque_bbox(a: np.ndarray, thr: float = 0.55):
    ys, xs = np.where(a[..., 3] > thr)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def clean_alpha(a: np.ndarray, thr: float = 0.55) -> np.ndarray:
    a = a.copy()
    a[..., 3] = (a[..., 3] > thr).astype(np.float32)
    return a


def downscale(a: np.ndarray, s: float) -> np.ndarray:
    """Premultiplied-alpha area downscale."""
    h, w = a.shape[:2]
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    chans = []
    for c in range(4):
        im = Image.fromarray((pm[..., c] * 255).astype(np.uint8), "L")
        chans.append(np.asarray(im.resize((nw, nh), Image.BOX)).astype(np.float32) / 255.0)
    out = np.stack(chans, -1)
    alpha = out[..., 3:4]
    rgb = np.where(alpha > 1e-4, out[..., :3] / np.maximum(alpha, 1e-4), 0)
    out = np.concatenate([np.clip(rgb, 0, 1), (alpha > 0.5).astype(np.float32)], -1)
    return out


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGBA")


def add_outline(img: Image.Image) -> Image.Image:
    a = np.asarray(img).copy()
    al = a[..., 3] > 0
    pad = np.pad(al, 1)
    neigh = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    ring = neigh & ~al
    a[ring] = OUTLINE
    return Image.fromarray(a, "RGBA")


def quantize_frames(frames: list[Image.Image], colors: int) -> list[Image.Image]:
    """Quantise all frames of a sheet to one shared palette."""
    opaque = [np.asarray(f)[np.asarray(f)[..., 3] > 0][:, :3] for f in frames]
    allpx = np.concatenate(opaque)
    side = int(np.ceil(np.sqrt(len(allpx))))
    canvas = np.zeros((side * side, 3), np.uint8)
    canvas[: len(allpx)] = allpx
    pal_img = Image.fromarray(canvas.reshape(side, side, 3), "RGB").quantize(colors, method=Image.Quantize.MEDIANCUT)
    out = []
    for f in frames:
        arr = np.asarray(f)
        q = f.convert("RGB").quantize(palette=pal_img, dither=Image.Dither.NONE).convert("RGB")
        qa = np.dstack([np.asarray(q), arr[..., 3]])
        out.append(Image.fromarray(qa.astype(np.uint8), "RGBA"))
    return out


def segment(a: np.ndarray, cols: int, rows: int, alpha_thr: float):
    """Find each sprite as a connected blob (frames on these sheets overlap the
    nominal grid), then order blobs into rows and columns by their centroids."""
    from scipy import ndimage

    h, w = a.shape[:2]
    cw, ch = w / cols, h / rows
    mask = a[..., 3] > alpha_thr
    labels, n = ndimage.label(mask)
    idx = np.arange(1, n + 1)
    sizes = ndimage.sum(mask, labels, idx)
    cys, cxs = np.array(ndimage.center_of_mass(mask, labels, idx)).T
    # each connected piece belongs to the cell that contains its centre of mass
    cell_of = (np.clip((cys // ch).astype(int), 0, rows - 1) * cols
               + np.clip((cxs // cw).astype(int), 0, cols - 1))
    ordered = []
    for r in range(rows):
        for c in range(cols):
            members = idx[(cell_of == r * cols + c) & (sizes >= 12)]
            if len(members) == 0:
                continue
            own = np.isin(labels, members)
            ys, xs = np.where(own)
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            crop = a[y0:y1, x0:x1].copy()
            crop[..., 3] *= own[y0:y1, x0:x1]  # drop other frames' fragments
            ordered.append(((r, c), clean_alpha(crop, alpha_thr)))
    return ordered


def build_sheet(name: str, src: str, cols: int, rows: int, target_h: int, ref_index: int,
                colors: int = 40, pick: list[tuple[int, int]] | None = None, alpha_thr: float = 0.55):
    a = load(src)
    crops = [(rc, img) for rc, img in segment(a, cols, rows, alpha_thr) if not pick or rc in pick]
    ref_h = crops[ref_index][1].shape[0]
    s = target_h / ref_h
    frames = [to_img(downscale(img, s)) for _, img in crops]
    frames = quantize_frames(frames, colors)
    frames = [add_outline(f) for f in frames]
    fw = max(f.width for f in frames) + 2
    fh = max(f.height for f in frames) + 2
    strip = Image.new("RGBA", (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * fw + (fw - f.width) // 2, fh - f.height - 1), f)
    strip.save(OUT / f"{name}.png")
    print(f"{name}: {len(frames)} frames of {fw}x{fh} (scale {s:.3f})")
    return {"src": f"/sprites/{name}.png", "frameW": fw, "frameH": fh, "frames": len(frames),
            "cells": [list(rc) for rc, _ in crops]}


def build_portrait(name: str, src: str, top_frac: float, size: int, colors: int = 40,
                   box: tuple[int, int, int, int] | None = None):
    a = load(src)
    if box:  # explicit square crop (x0, y0, x1, y1) in source pixels
        crop = clean_alpha(a[box[1] : box[3], box[0] : box[2]])
    else:
        x0, y0, x1, y1 = opaque_bbox(a)
        h = y1 - y0
        crop = clean_alpha(a[y0 : y0 + int(h * top_frac), x0:x1])
        # square crop centred on the head
        ch, cw = crop.shape[:2]
        side = min(ch, cw)
        cx = cw // 2
        crop = crop[:side, max(0, cx - side // 2) : max(0, cx - side // 2) + side]
    side = crop.shape[0]
    img = to_img(downscale(crop, size / side))
    img = add_outline(quantize_frames([img], colors)[0])
    img.save(OUT / f"{name}.png")
    print(f"{name}: {img.size}")
    return {"src": f"/sprites/{name}.png", "w": img.width, "h": img.height}


if __name__ == "__main__":
    meta = {
        # 4x3 pose sheet of the scholar mage; ref = idle pose (row 0, col 0)
        "mage": build_sheet("mage", "mage-sheet.png", 4, 3, target_h=84, ref_index=0, colors=48),
        "mageHero": build_sheet("mage-hero", "mage-single.png", 1, 1, target_h=150, ref_index=0, colors=48),
        # 4x3 pose sheet of the dragon familiar
        "dragon": build_sheet("dragon", "dragon-sheet.png", 4, 3, target_h=46, ref_index=0, colors=40, alpha_thr=0.6),
        # 5x9 animation sheet: rows are animations, 5 frames each
        "dragonAnim": build_sheet("dragon-anim", "dragon-anim.png", 5, 9, target_h=44, ref_index=0, colors=40, alpha_thr=0.6),
        "dragonHero": build_sheet("dragon-hero", "dragon-single.png", 1, 1, target_h=96, ref_index=0, colors=40, alpha_thr=0.6),
        # animation sheets (rows = animations, 6 frames each)
        #  actions: 0 idle-book, 1 idle-wink, 2 read, 3 laptop, 4 cast, 5 celebrate, 6 confused, 7 coffee
        "mageActions": build_sheet("mage-actions", "mage-actions.png", 6, 8, target_h=84, ref_index=0, colors=56, alpha_thr=0.75),
        "mageActionsS": build_sheet("mage-actions-s", "mage-actions.png", 6, 8, target_h=56, ref_index=0, colors=48, alpha_thr=0.75),
        #  move: 0 walk-right, 1 walk→sit, 2 sit idle→laptop, 3 typing, 4 close laptop, 5 stand up→idle
        "mageMove": build_sheet("mage-move", "mage-walk-sit.png", 6, 6, target_h=84, ref_index=35, colors=56),
        "mageMoveS": build_sheet("mage-move-s", "mage-walk-sit.png", 6, 6, target_h=56, ref_index=35, colors=48),
        "dragonAnimS": build_sheet("dragon-anim-s", "dragon-anim.png", 5, 9, target_h=30, ref_index=0, colors=40, alpha_thr=0.6),
        "mageS": build_sheet("mage-s", "mage-sheet.png", 4, 3, target_h=56, ref_index=0, colors=48),
        "portrait": build_portrait("portrait", "mage-single.png", top_frac=0.42, size=48),
        "dragonPortrait": build_portrait("dragon-portrait", "dragon-single.png", top_frac=0.6, size=40,
                                         box=(500, 150, 1080, 730)),
    }
    (OUT / "sprites.json").write_text(json.dumps(meta, indent=2))
