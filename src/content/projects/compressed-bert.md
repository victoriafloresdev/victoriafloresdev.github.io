---
title: Pruning a model and choosing its data, as one decision
kind: research
label: First author · KDMiLe 2026
org: SPEED Lab, UFMG
role: First author. I designed the method, implemented it, ran the experiments and wrote the paper, with support from my co-authors. It began as a project in UFMG's course on Intelligent, Responsible and Sustainable NLP.
period: '2026'
summary: Choosing fine-tuning data in the representation space of the layers a compressed BERT keeps, to cut compute without losing more accuracy than necessary.
metrics:
  - value: −69%
    label: training compute (FLOPs proxy) vs. full BERT
  - value: −13 to −19%
    label: peak GPU memory
  - value: '12'
    label: seeds per configuration, with paired statistical tests
stack: [PyTorch, Hugging Face Transformers, BERT, kernel methods]
links:
  - label: Paper (in Portuguese, English abstract)
    href: https://sol.sbc.org.br/index.php/kdmile/article/view/44994
order: 5
featured: false
---

## In short

There are two common ways to make fine-tuning cheaper: make the model smaller by removing layers, or train it on fewer examples. Teams usually make these two decisions separately. But removing layers changes how the model "sees" the data, so an example that looks informative to the full model may not be informative to the smaller one.

My hypothesis was simple: **choose the training data from the point of view of the layers you are going to keep.**

## The method

1. **Choose the layers.** On a small calibration set, score each layer by how well its representations line up with the task, minus how redundant it is with layers already chosen. Keep the best 10 of 12.
2. **Build the selection space** from the kept layers only.
3. **Choose the examples** that best cover that space, keeping the classes balanced, down to half of the training data.
4. **Prune and fine-tune** the smaller model.

## How I evaluated it

BERT-base on two standard tasks (SST-2 and QNLI), 12 fixed seeds with the same data per seed for every configuration, and paired comparisons with a correction for multiple tests. I compared against the full model, random layer choices, a published layer-importance baseline and simpler variants of my own method, and measured cost directly: FLOPs, GPU memory, training time and energy.

## What I found

The method had the best accuracy among the compressed variants on both tasks, with its clearest win on QNLI (+6.25 points over the published baseline, 9 wins in 11 paired runs). Compared with the full model, it used **about 69% less compute** and 13–19% less peak GPU memory.

## Honest limits

Compressed models still trail full BERT by about 6–8 points in this setup; the goal was competitive compression, not beating the full model. Selecting examples runs on the CPU and adds overhead, so total wall-clock time actually went up even though GPU time went down. This is initial evidence on two tasks and one architecture, and I report it that way. That habit of measuring cost instead of assuming it, and of saying what didn't work, is how I approach any evaluation.
