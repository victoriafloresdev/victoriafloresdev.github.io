---
title: The plumbing behind an internal GenAI platform
kind: production
label: In production
org: Localiza&Co
orgNote: Latin America's largest car-rental and fleet company
role: AI Engineering Intern, GenAI Platform team. I owned RAG observability, the vector-store migration and access governance, and led the developer cookbook.
period: Feb 2025 – Feb 2026
summary: The LLM gateway, cost tracking and retrieval infrastructure that let product teams build with LLMs quickly and safely.
metrics:
  - value: 4h → 15 min
    label: to approve access to the LLM gateway
  - value: −35%
    label: p95 latency of the RAG pipeline
  - value: −40%
    label: vector-search latency after the migration
  - value: ~60%
    label: faster developer ramp-up (internal survey)
stack: [Python, FastAPI, RabbitMQ, MongoDB Atlas Vector Search, Datadog, OpenAI, AWS Bedrock]
note: A deliberately high-level account of internal work. It includes no internal system names, code or data.
order: 2
featured: true
---

## In short

When more and more teams at Localiza wanted to build with LLMs, the company needed one governed way in: a gateway to several model providers, visibility into usage and cost, shared knowledge bases for retrieval, and a fast, safe path for new teams to get started. I worked on the platform team that built it, and owned four pieces of it.

## The problem

Every piece had friction. Getting access to the gateway took hours of manual approvals. The retrieval (RAG) services were hard to debug because nobody could see where the time went. The self-hosted vector database made developer environments slow to set up. And new developers learned the platform from scattered documentation.

## What I did

**Made the RAG services observable.** I added structured logging and performance metrics at every stage of the pipeline, from document ingestion and embedding to retrieval and generation. The data showed exactly where the time went: an unoptimized vector search and LLM calls that took an inefficient route through the internal gateway. Once those were fixed, **p95 latency dropped by about 35%**.

**Migrated the vector store.** I moved our knowledge bases from a self-hosted MongoDB to MongoDB Atlas with native vector search, re-indexing the data and keeping the service up during the cutover. Vector-search latency fell by about 40% and developer setup got about 50% faster.

**Automated access governance.** I co-designed and implemented an intake flow that captures each new use case up front and removes the manual hand-offs. Approval time went **from four hours to fifteen minutes**, and every new project now arrives with the information the platform team needs.

**Wrote the on-ramp.** I led a cookbook of runnable notebooks covering the gateway, retrieval and agents. An internal survey measured about 60% faster ramp-up, and more than 12 new projects started on the platform.

## What this was, and wasn't

This was platform engineering, not model training. I didn't build the models; I built the parts that make them usable, observable and governable for a whole company. If I were to continue, I'd add answer-quality metrics (retrieval recall, groundedness, regression tests on a labeled question set) next to latency and cost. A fast pipeline that gives wrong answers is still wrong.
