# Task 1 — A/B Test Chatbot (n8n + Statsig)

## Overview

This workflow implements a controlled A/B experiment on new user onboarding for the CalorAI
Telegram bot. Every new user is automatically assigned to either a **Control** or **Test** group
via Statsig, and their group is persisted in Supabase so the assignment is sticky across sessions.

---

## How the Workflow Works

### Full Flow

```
Telegram Trigger
       │
       ▼
CHECK DB FOR USER INFO  (GET /users?telegram_user_id=eq.{id})
       │
       ▼
CHECK IF USER EXISTS
    ├── YES (existing user)
    │       └── Set Existing User
    │               ├── GREET USER          → "Hi, welcome back."
    │               └── IF Group            → CONTROL MESSAGE or TEST MESSAGE
    │
    └── NO (new user)
            └── Set New User (telegram_user_id, chat_id, onboarding_step=0)
                    │
                    ▼
            STATSSIG EXPERIMENT  (POST /v1/get_config → returns group_name)
                    │
                    ▼
            INSERT TO DB  (POST /users → saves user + experiment_group)
                    │
                    ▼
            ADD LOGS  (POST /events → logs group_assigned event)
                    ├── WELCOME USER        → "Welcome to CalorAI."
                    └── IF Group
                            ├── control → CONTROL MESSAGE
                            └── test    → TEST MESSAGE
```

### Group Experiences

| Group | Message received |
|---|---|
| **Control** | "You can log meals and track your day." — minimal, no guidance |
| **Test** | "I help you log meals and track your day in a simple way. You can send meals in plain English, for example: Ate 2 eggs and toast. Send your first meal now to get started." — guided with a concrete example |

### Event Logging

Every new user triggers a `group_assigned` event written to the `events` table:

```json
{
  "telegram_user_id": "123456789",
  "event_name": "group_assigned",
  "experiment_group": "test",
  "metadata": {}
}
```

This structured log is the foundation for all downstream metric analysis.

---

## Section 3 — Evaluation Plan

### Background

Long-term retention (Day-30, Day-60) is a lagging metric — it takes weeks to observe and
cannot guide fast product decisions. This experiment uses **leading indicators** that are
measurable within the first 1–7 days and are well-established predictors of long-term retention
in messaging and health utility apps.

**Hypothesis:**
> A structured, example-driven onboarding message will increase the rate at which new users
> log their first meal, leading to better habit formation and higher long-term retention
> compared to a generic one-line welcome.

---

### Primary Metric — Leading Indicator

#### Day-3 Meal Logging Rate

**Definition:** The percentage of users in each group who log at least one meal within
72 hours of receiving their onboarding message.

**Why this is the right metric:**

Early action is the strongest predictor of long-term retention in utility bots.
A user who logs a meal in their first 3 days has:
- understood the core value proposition of the product
- taken the first step toward habit formation
- demonstrated intent to return

This is measurable almost immediately, unlike Day-30 retention, and directly reflects
whether the onboarding message successfully motivated the user to act.

**How it is measured** (using the `events` table in Supabase):

```sql
SELECT
  experiment_group,
  COUNT(DISTINCT activated.telegram_user_id)  AS users_who_logged,
  COUNT(DISTINCT all_users.telegram_user_id)  AS total_users,
  ROUND(
    COUNT(DISTINCT activated.telegram_user_id)::numeric
    / NULLIF(COUNT(DISTINCT all_users.telegram_user_id), 0) * 100, 1
  ) AS day3_activation_rate_pct
FROM events all_users
LEFT JOIN events activated
  ON  activated.telegram_user_id = all_users.telegram_user_id
  AND activated.event_name        = 'meal_logged'
  AND activated.created_at       <= all_users.created_at + INTERVAL '3 days'
WHERE all_users.event_name = 'group_assigned'
GROUP BY experiment_group;
```

---

### Guardrail Metrics — Do No Harm

Guardrail metrics detect unintended negative side effects of the Test experience.
**If any guardrail is breached, the experiment is paused immediately** — regardless
of what the primary metric shows.

| Metric | Definition | Threshold |
|---|---|---|
| **Bot block rate** | % of users who block the Telegram bot within 24 hours of their onboarding message | Must not exceed the Control group rate by more than 2 percentage points |
| **Onboarding drop-off rate** | % of Test group users who receive the welcome message but send zero follow-up messages within 24 hours | Must remain below 80% |
| **Silent failure rate** | % of incoming messages that receive no bot reply (unhandled intent or workflow error) | Must remain below 10% |

**Why these guardrails matter:**

A longer or more directive onboarding message could backfire — it might feel overwhelming,
confusing, or pushy to some users, causing them to disengage or block the bot immediately.
Guardrails ensure we catch any of these effects before they affect a large portion of users.

The bot block rate is particularly important because a Telegram block is a permanent signal —
it means the user will never return, and it also affects Telegram's own spam scoring of the bot.

---

### Secondary Metrics

Secondary metrics add explanatory depth. They do not determine the ship/no-ship decision
on their own, but they help explain *why* the primary metric moved the way it did.

| Metric | Definition |
|---|---|
| **Day-7 return rate** | % of users who send at least one message on Day 7 |
| **Onboarding completion rate** | % of Test group users who progress through all onboarding steps (tracked via `onboarding_step` in the `users` table — scaffolded for future multi-step flow) |
| **Meals per user — Days 1 to 3** | Average number of distinct meal logs per user in the first 72 hours |
| **Feature breadth** | % of users who use more than one feature within their first week (e.g. log + track, or log + edit) |

---

### Pre-committed Decision Framework

#### Experiment duration
The experiment runs for a minimum of **14 days** or until **200 users per group** are enrolled,
whichever comes later. Results are evaluated only after this window closes — no early stopping.

#### Statistical thresholds
- Significance level: **p < 0.05** (two-tailed)
- Minimum detectable effect: **5 percentage points** on the primary metric
- Statistical power: **80%**
- Required sample size: ~175 users per group
  *(assumes a baseline Day-3 activation rate of 30%)*

#### Decision table

| Outcome | Decision |
|---|---|
| Primary metric significantly higher in Test (p < 0.05) AND no guardrail is breached | ✅ **Ship.** Roll Test onboarding out to 100% of new users |
| Primary metric higher but one or more guardrails are breached | ⚠️ **Do not ship.** Pause experiment, investigate root cause (e.g. message tone, length), revise and re-test |
| No statistically significant difference between groups | 🔁 **Roll back to Control.** Simpler is cheaper to maintain. Explore alternative onboarding hypotheses |
| Primary metric is lower in Test group | ❌ **Do not ship.** Structured onboarding is actively harmful in its current form. Discard and redesign |

#### Why pre-commitment matters

Deciding the decision rules *before* the experiment starts prevents two common mistakes:
- **p-hacking** — repeatedly checking results and stopping when you see significance
- **Confirmation bias** — interpreting ambiguous results as a win because you want the Test to work

The thresholds and rules above are fixed and will not be adjusted after the experiment begins.

---

## Assumptions & Trade-offs

**Test group is a single enriched message, not a 3-step stateful flow.**
The `onboarding_step` field is persisted in the `users` table specifically to support
a multi-step flow in the next iteration — the DB schema is ready, the UX progression
is the planned next build. This was a deliberate time trade-off.

**Existing users are handled gracefully.**
Returning users are detected via a Supabase lookup before any experiment logic runs.
They receive a simple "Welcome back" message and bypass the A/B routing entirely,
preventing them from being re-bucketed or re-messaged with onboarding content on every visit.

**Group assignment is stable.**
Statsig handles consistent bucketing — the same user will always receive the same group
on repeated calls. The group is also persisted in Supabase as a backup source of truth
for analytics queries that don't go through Statsig.
