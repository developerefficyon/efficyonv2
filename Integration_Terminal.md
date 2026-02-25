# “Integration terminal” for Claude Agents

## Purpose

The Integration Terminal is an internal testing interface that allows Claude agents to upload synthetic datasets directly into Efficyon, simulating real SaaS integrations.

Instead of relying on OAuth connections, agents insert structured files (CSV, JSON, folders) which Efficyon treats as live integration data.

This enables automated testing, optimization, and QA without touching real customers.

---

## Core Logic

1. Agent generates mock company data
2. Agent uploads files into a new “test workspace”
3. Files are labeled as integrations (e.g., Fortnox, M365)
4. Efficyon parses and normalizes the data
5. Analyses (standard, deep, cross) are triggered
6. Results + logs are stored for evaluation

Each workspace = one simulated company scenario.

---

## What It Must Support

- Upload multiple files or zipped folders
- Label files by simulated integration
- Schema validation (required columns, formats)
- Partial ingestion (for stress testing)
- API-triggered analyses
- Result retrieval for scoring and comparison

---

## Structural Requirements

Each workspace should store:

- Uploaded files
- Integration labels
- Validation report
- Analysis results
- Prompt/template version used
- Logs and error traces

This ensures reproducibility and comparison between runs.