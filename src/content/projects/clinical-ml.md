---
title: Machine learning for the heart and the ICU
kind: research
label: CinC 2025 · ENIAC 2024–25
org: SPEED Lab, UFMG, with the telehealth center of UFMG's university hospital
role: Co-author of three papers in a highly collaborative team; I contributed across ideation, implementation, experiments and writing, and built the clustering pipeline for the sepsis study.
period: 2024 – 2025
summary: Three studies on ECGs and intensive-care data, from making heart diagnosis work with fewer sensors to finding hidden patient subgroups in sepsis.
metrics:
  - value: 2 ≈ 12
    label: leads needed to match a full 12-lead ECG model (macro-F1 0.885)
  - value: '>4×'
    label: more efficient ECG audits than random sampling
  - value: '5'
    label: sepsis subphenotypes identified in ICU data
stack: [PyTorch, CNN + Transformer, visibility graphs, UMAP, MIMIC-IV]
links:
  - label: ECG audit (CinC 2025)
    href: https://doi.org/10.22489/CinC.2025.451
  - label: Lead selection (ENIAC 2025)
    href: https://doi.org/10.5753/eniac.2025.14543
  - label: Sepsis (ENIAC 2024)
    href: https://doi.org/10.5753/eniac.2024.245281
order: 6
featured: false
---

## In short

Three projects, one thread: making clinical AI more useful in the places care actually happens.

## Diagnosing with fewer sensors

A hospital ECG records the heart from 12 viewpoints, called leads. Wearables record only one or two. We built a pipeline that ranks leads by combining several interpretability methods, then adapts a CNN + Transformer model to use only the most informative ones. **With just two leads it matched the full 12-lead model** (macro-F1 of 0.885). That is a path toward clinical-grade AI at home and in low-resource settings.

## Auditing the right exams

Telehealth services audit a sample of ECGs to check diagnostic quality, usually chosen at random. We turned each ECG into a graph and combined graph features with time-series features to find the exams most worth a specialist's time. Targeting audits this way made them **more than four times as efficient** as random sampling.

## Finding hidden groups in sepsis

Sepsis is not one disease but many. Using ICU records from MIMIC-IV, I built the clustering pipeline (imputation, dimensionality reduction and K-means) that separated patients into **five clinically distinct subphenotypes**, a finer view than the standard severity score and a step toward more personalized treatment.
