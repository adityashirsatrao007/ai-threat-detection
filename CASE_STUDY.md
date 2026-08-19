# Case Study — SentinelX: Real-Time AI Threat Detection Platform

**Role:** Creator / Lead Engineer · **Status:** 🥇 1st place — Hack from the Future 3.0 (600+ teams)

## 1. The problem

Phishing, scam, and social-engineering attacks are moving off the inbox and into SMS, chat, and phone calls. Traditional SEGs (secure email gateways) only see email and rely on static blacklists — they miss novel, personalized scams in other channels, and they give SOC analysts no risk-based prioritization.

**Goal:** one platform that ingests communications from email, SMS, messaging, and voice, scores them for malicious intent in real time, and gives a security team actionable, explainable alerts.

## 2. Approach

A hybrid detection pipeline instead of a single model:

- **NLP classification** — Hugging Face `DistilBERT` + zero-shot classification on message text to catch scam/phishing language even when the URL or sender is novel.
- **Behavioral rule engine** — configurable social-engineering patterns (urgency, credential requests, impersonation signals) that don't depend on any one model.
- **URL threat scoring** — regex/heuristic extraction with an optional VirusTotal enrichment step.
- **ML risk scoring** — combines model confidence + behavioral signals into one normalized severity, so a SOC can prioritize instead of triage 100 alerts.

Messages flow through an async pipeline: ingest → analysis → scoring → alerting, decoupled with a broker so heavy model work never blocks ingestion.

## 3. Architecture

```
Email / SMS / Voice ──▶ API ──▶ Celery workers (per channel queues)
                                  │
                                  ├─ DistilBERT / zero-shot NLP scoring
                                  ├─ Behavioral rule engine
                                  └─ URL enrichment → ML risk score
                                  │
                            PostgreSQL (users, alerts, audit)
                                  │
                    Web dashboard + alerting for the SOC
```

- **Backend:** FastAPI (typed settings via `pydantic-settings`, `/health`, CORS-scoped).
- **Workers:** Celery with channel-specific queues (`email`, `sms`, `call`) + Flower monitoring.
- **Data:** PostgreSQL (auth + alerts), Redis (broker + result backend).
- **Security posture:** password hashing, optional Fernet encryption of stored secrets, env-driven secrets (no defaults), `SECURITY.md`, containerized with Docker Compose.

## 4. Results & impact

- **1st place**, Hack from the Future 3.0 — 600+ teams.
- Real-time detection across 4 channels (email, SMS, messaging, voice) with per-message risk scores and explainable reasons.
- Detection does not depend on a single vulnerability or signature — novel-scam text is caught by the NLP layer, behavioral layer, or scoring aggregation.
- Production-style engineering from day one: healthchecks, async workers, typed config, containerized delivery, threat-intel-ready endpoints.

## 5. What I'd do differently

- Add online/fine-tuning feedback loop so SOC analyst confirmations improve the classifier over time.
- Move the model serving to a dedicated GPU/inference service to cut cold-start latency.
- Schema-evolution migrations (Alembic) for the alert store before long-term adoption.

## 6. What recruiters should ask in interviews

Latency/share of the async pipeline, how the hybrid scores are fused, why DistilBERT over a larger model, and how we made the system explainable for a SOC operator.