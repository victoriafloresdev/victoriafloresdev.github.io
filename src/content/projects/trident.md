---
title: 'TRIDENT: teaching a Transformer that "missing" is information'
kind: research
label: BRACIS 2025 · Springer
org: SPEED Lab, UFMG
role: Second author in a highly collaborative team. I co-designed the architecture, implemented it, built the hyperparameter-optimization framework and ran the comparison with the baselines.
period: 2024 – 2025
summary: A Transformer for tabular data that learns from missing values instead of filling them in, and stays robust with up to 80% of the data missing.
metrics:
  - value: '+3.4 pp'
    label: macro-F1 over the best of six baselines
  - value: 40%+
    label: missingness where it beats every baseline
  - value: '9'
    label: real-world datasets in the benchmark
stack: [PyTorch, Optuna, scikit-learn, self-supervised learning]
links:
  - label: Paper
    href: https://doi.org/10.1007/978-3-032-15984-7_39
  - label: Code
    href: https://github.com/guihenri04/TRIDENT
order: 3
featured: true
---

## In short

Real-world tables, from clinical records to credit files and sensor logs, are full of gaps. The usual recipe is to fill the gaps first and train a model second. But filling in values can quietly introduce bias, and the fact that something is missing is often informative in itself: a lab test that was never ordered tells you something about the patient.

TRIDENT takes a different route. Instead of filling the gaps, it **teaches the model to read them**.

## How it works

Every column of a row becomes a token, a bit like a word in a sentence. Each column also gets two special learned embeddings: one that means "this value is missing" and one that means "this value is hidden for training". The model sees absence directly, with no imputation step.

Training happens in two stages. First, the model plays a game of fill-in-the-blank with itself: we hide some of the values it *does* have and ask it to reconstruct their representations from context. This teaches it how the features relate to each other, even when many are absent. Then we fine-tune it for the actual classification task.

## How we tested it

We built a benchmark of nine public datasets from different domains and removed values at random at four levels: 20%, 40%, 60% and 80%. We compared TRIDENT with six strong baselines, including gradient-boosted trees (XGBoost, LightGBM), Random Forest and three tabular Transformers (TabNet, FT-Transformer, SAINT), all under the same tuning protocol.

## What we found

With little missing data, LightGBM is slightly ahead, which is what you'd expect: tree ensembles are excellent on clean tables. **From 40% missingness onward, TRIDENT beats every baseline**, and its lead grows as the data gets sparser, up to +3.4 points of macro-F1.

## What it is, and what it isn't

It isn't a universal winner. On complete or lightly missing data, boosted trees are as good or better, and much cheaper. It is a better inductive bias when data is badly incomplete. In this study missingness was injected at random; testing on the messy, non-random gaps of real data is the next step.
