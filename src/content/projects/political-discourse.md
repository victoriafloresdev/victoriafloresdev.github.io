---
title: Mapping 22 years of political speech in Brazil's Congress
kind: research
label: AAAI ICWSM 2026
org: UFMG, Computer Science Department
role: Second author. I contributed across the project and focused on the stylometric and topic analyses; I co-wrote the paper, designed its diagrams, led the final analysis and presented it in Los Angeles.
period: 2025 – 2026
summary: An NLP framework that reads 453,000 parliamentary speeches through three lenses (how deputies speak, what they talk about, and who sounds alike).
metrics:
  - value: 453k
    label: speeches analyzed (2003–2025)
  - value: '3'
    label: complementary lenses on the same corpus
  - value: ICWSM
    label: a leading international venue in computational social science
stack: [Python, BERTopic, sentence-transformers, UMAP, HDBSCAN, gensim]
links:
  - label: Paper
    href: https://ojs.aaai.org/index.php/ICWSM/article/view/42745
  - label: Code
    href: https://github.com/flaviosoriano/multifaceted-political-analysis
order: 4
featured: true
---

## In short

Most studies of legislatures look at how representatives vote. Votes are useful, but coarse: they often just follow the party line. Speeches say much more about how people frame issues and who they really align with. We built a way to read more than two decades of them at scale.

## The data

We collected **453,280 speeches** given in Brazil's Chamber of Deputies between 2003 and 2025, linked each one to who said it (party, state, gender, education), and cleaned the transcripts so each document is a single speaker's own words.

## Three ways of reading

**How things are said.** A stylometric analysis tracks the length, structure and complexity of speeches over time.

**What is said.** Contextual topic modeling, with multilingual sentence embeddings clustered into topics, shows which themes organize the debate each year.

**Who speaks alike.** We represent each deputy by the meaning of their speeches and cluster them, then compare those clusters with formal party lines.

## What we found

- Speeches got **shorter and simpler** over the years, consistent with politics adapting to media and social networks.
- The agenda is **reactive**: dominant topics shift abruptly around national crises such as the 2016 impeachment and the COVID-19 pandemic.
- Discursive groups **cut across parties**: regional and gender identities often bring deputies together as much as party does.

## Why it matters beyond politics

The same pipeline works for any large body of text that changes over time, like customer feedback, support tickets or internal documentation. It answers three questions any team cares about: what is being said, how that is shifting, and who sounds alike.
