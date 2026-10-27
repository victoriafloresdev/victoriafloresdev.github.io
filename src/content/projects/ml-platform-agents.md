---
title: Agents that run an ML platform's routine work
kind: production
label: In production
org: iFood
orgNote: Latin America's largest food-delivery platform
role: Owner of the integration between iFood's GenAI agent platform and its ML platform; I built the access-automation agents.
period: 2026 – present
summary: LLM agents that triage support requests and carry out routine infrastructure changes for the ML platform behind ~270 production models, with a human approving every change.
metrics:
  - value: '~70%'
    label: of routine access requests handled end to end
    estimate: true
  - value: '~1h → 10 min'
    label: of engineer time per request
    estimate: true
  - value: '0'
    label: changes applied without a person's approval
stack: [Python, LangGraph, MCP, Pydantic, Terraform]
note: A deliberately high-level account of internal work. It includes no internal system names, code, data or confidential figures.
order: 1
featured: true
---

## In short

iFood's ML platform is the infrastructure behind roughly 270 models in production. Teams across the company bring their questions and requests to the platform's support channel, and a large share of them are routine: create a workspace for a new team, add a member, remove one. Each of these is a small infrastructure-as-code change that an engineer used to prepare, review and apply by hand.

I built the LLM agents that now take this work off engineers' plates, without taking people out of the loop. One agent reads every new request and sorts it by type and urgency. Others carry out the routine access changes from start to finish: they prepare the change, open it for review and then wait. **Nothing reaches production until a person approves it.**

## Why it was hard

Routine requests are repetitive enough to automate, but sensitive enough that a wrong change is a real incident. An agent that "usually works" is not good enough when it edits who can access production systems. So the question was never "can an LLM do this?" but "how do we make it safe, predictable and easy to trust?"

## What I built

**A triage agent.** It started as a hackathon prototype and became a production service. It reads incoming requests, classifies them by category and priority using a curated knowledge base about the platform, and lives in the same channel where people already ask for help.

**Access-automation agents.** A routing step first decides what kind of request it is, or that it is out of scope. The agent then follows a written, versioned procedure (a "skill") to prepare the infrastructure change and open it for review. A human approves, the change is applied, and the agent reports back to whoever asked.

**A design that assumes things will go wrong.** Before writing code, I wrote a short specification and a "constitution" of non-negotiable rules: test in a sandbox before production, always stop for human approval, validate every output against a schema, and never swallow an error. Design decisions are recorded so the next engineer knows why things are the way they are.

**Production hardening.** I ran a robustness review of the whole agent flow and fixed what it found: timeouts, limits on how many times a loop can run, a circuit breaker, structured state and logging, and more reliable approval checkpoints.

## What I learned

- **Models need to be told, clearly, to use their tools.** The model often answered in prose instead of calling a tool. A short, explicit section in the system prompt raised the share of turns with a real tool call from about 40% to about 95% (estimated).
- **Tools that fail quietly are worse than tools that fail loudly.** One action was silently timing out; a "file not found" crashed a flow. Agents that touch real systems need explicit timeouts, operations that are safe to retry, and "not found" treated as a normal answer.
- **Know where the LLM shouldn't be.** Together with the team, I proposed moving the most sensitive flow from a free-form agent to a deterministic workflow, with the model used only where judgment is actually needed. On a path that changes production, predictability beats flexibility.

## What I'd do differently

Build a dedicated "ask a human" tool from day one instead of detecting approval phrases. Write tests from the first iteration. And keep a set of real, labeled requests so every prompt or procedure change is checked against known cases before it ships.
