# HandSpeak Product Objectives and Phase Plan (For Claude)

## Why this document exists

This is the source of truth for what we are building.
Each prompt sent to Claude is one phase.
One prompt = one phase.

This is not an MVP roadmap. It is a full objective-driven build plan.

## Product mission

HandSpeak should teach beginners to communicate in ASL for real conversations, not just recognize isolated signs.

## Primary outcomes

1. A beginner can understand and produce common conversational ASL exchanges.
2. Learning is structured through island progression (topic-based worlds).
3. Progress reflects communication ability, not just word memorization.

## Core learning principles

1. Conversation-first curriculum: prioritize high-frequency real-life communication.
2. Context-first practice: every word appears in realistic interaction context.
3. Response-first drills: user answers prompts, questions, and situations.
4. Continuous reinforcement: spaced review and adaptive remediation.
5. Clarity over quantity: fewer words with higher usability beats large disconnected vocab lists.

## Non-negotiable constraints

1. Do not break working gesture model inference paths.
2. Keep backend and frontend stable while introducing new systems.
3. Every phase must have acceptance criteria and testable outputs.
4. UX should remain understandable for first-time ASL learners.
5. Avoid fake gamification loops that do not improve learning outcomes.

## Mandatory product refactor directive (critical)

Current learner flow is fragmented and confusing (example: alphabet content in Study Voyage while word content is split into Word Practice).
This must be treated as a full learning-experience refactor, not a small UI fix.

Claude must enforce these rules across implementation phases:

1. Build one unified learning journey, not disconnected feature silos.
2. Reorganize content architecture so learners progress in a pedagogically logical sequence.
3. Remove mode confusion between study and practice by clarifying purpose, entry points, and outcomes of each screen.
4. Ensure alphabet, words, phrases, and conversation drills are connected in one progression model.
5. Keep existing model inference functionality intact while refactoring UX and learning structure.

Definition of done for this directive:

1. A beginner can explain where to start, what to do next, and why each activity matters.
2. No duplicate learning paths with overlapping purpose remain.
3. Navigation and curriculum structure reflect one coherent learner mental model.
4. Progress tracking is unified across all learning modes.

## Target learner profile

1. Beginner with zero ASL background.
2. Wants practical, daily conversational skill.
3. Needs confidence-building and clear feedback.
4. Learns better with short guided loops and visible progression.

## Island architecture (learning worlds)

Use islands as thematic conversation domains. Suggested domains:

1. Greetings and Openers
2. Introductions and Identity
3. Daily Routine and Time
4. Needs, Help, and Repairs ("again", "slow", "I don't understand")
5. Feelings and Reactions
6. Places and Directions
7. Social Small Talk and Short Stories

Each island should include:

1. Core vocabulary set
2. Core conversational templates
3. Response drills
4. Boss dialogue challenge
5. Island completion rubric

## Signature learning mode

Reply Quest (required):

1. NPC signs or presents a conversational prompt.
2. Learner responds with correct sign choice/sequence.
3. System scores meaning, order, confidence, and timing.
4. Feedback teaches correction, not just pass/fail.

## Progress framework

Track communication readiness, not only completion percentages.

Required metrics:

1. Island completion
2. Response accuracy
3. Context accuracy
4. Fluency/timing stability
5. Retention score (review performance)
6. Readiness badges for real scenarios

## Phase system (one Claude prompt per phase)

Below are the official phases for prompting Claude.
Each phase is implementation-first: every prompt must ship working features (code + DB + UI + tests/evidence), not just planning text.

Phase completion rule:

1. Backend code is updated and runnable.
2. Frontend code is updated and usable.
3. Database schema/data flow is updated if needed.
4. Verification evidence is provided (API checks, UI flow checks, and test results).
5. Any unresolved risk is listed with concrete next action.

---

## Phase 1 - Core conversation loop implementation (done)

Objective:
Ship a usable end-to-end conversation practice loop for one island (Greetings) and establish the unified learning architecture baseline.

Deliverables:

1. Backend endpoints for conversation prompt session start/submit
2. Frontend playable practice flow (prompt -> user response -> feedback)
3. Persistence for attempt logs and per-user results
4. Seed content for Greetings island prompt set
5. Refactored learning navigation map that removes the alphabet-vs-word split confusion
6. Clear screen responsibilities for learn, drill, and conversation modes

Acceptance criteria:

1. User can complete one full conversation practice cycle in app.
2. Attempt is stored and visible in user progress retrieval.
3. First-time learner path is linear and understandable from entry to first completion.

---

## Phase 2 - Response behavior engine (done)

Objective:
Implement response-type aware scoring and feedback.

Deliverables:

1. Response type taxonomy in code (confirm, deny, clarify, ask-back, react, repair)
2. Scoring logic that evaluates response type correctness
3. Feedback generator that explains mismatch and correction
4. API + UI support to surface response type score breakdown

Acceptance criteria:

1. At least 3 response types are scored and displayed in UI.
2. Feedback explains why response is wrong and what correct response type should be.

---

## Phase 3 - Multi-turn conversation chains (done)

Objective:
Implement 3-6 turn conversation sessions with coherence scoring.

Deliverables:

1. Session model for multi-turn state and turn history
2. Backend orchestration for next-turn prompt generation/selection
3. Coherence scoring across full chain
4. Frontend turn-by-turn experience with summary screen

Acceptance criteria:

1. User can finish a 3-turn chain with stored full turn transcript.
2. Summary includes per-turn and overall coherence scores.

---

## Phase 4 - Island mastery and unlock logic (done)

Objective:
Implement progression logic that unlocks islands and lessons by demonstrated ability.

Deliverables:

1. Four-axis mastery model (comprehension, response accuracy, timing, repair)
2. Unlock rule engine driven by mastery thresholds
3. Retry/remediation assignment logic
4. Backend + frontend island state synchronization

Acceptance criteria:

1. Users cannot skip core response skills accidentally.
2. Island unlock status updates automatically after qualifying sessions.

---

## Phase 5 - Situation cards and context-aware scoring (done)

Objective:
Make conversations context-sensitive so correctness depends on scenario.

Deliverables:

1. Situation card model (school, store, commute, first meeting, help request)
2. Context-aware scoring adjustments
3. Context mismatch feedback messages
4. Frontend context display in practice session

Acceptance criteria:

1. Same response can score differently under different contexts.
2. User receives explicit context appropriateness feedback.

---

## Phase 6 - Clarification and repair drills (done)

Objective:
Implement misunderstanding recovery practice as a first-class feature.

Deliverables:

1. Drill mode where system intentionally injects misunderstandings
2. Repair response detection (repeat, slow down, rephrase, confirm)
3. Drill-specific feedback and scoring
4. Progress impact from repair performance

Acceptance criteria:

1. User can complete at least one full repair drill sequence.
2. Repair ability contributes to mastery score.

---

## Phase 7 - Island boss dialogues

Objective:
Ship branching conversation boss encounters per island.

Deliverables:

1. Branching dialogue trees for at least 2 islands
2. Boss outcome logic (pass/fail + coaching path)
3. Boss performance persistence and replay options
4. UI flow for boss intro, run, and result

Acceptance criteria:

1. User can start and finish boss dialogue with branching behavior.
2. Boss outcomes affect island progression state.

---

## Phase 8 - Adaptive review system

Objective:
Build spaced repetition and weak-skill targeting.

Deliverables:

1. Review scheduler
2. Weak-skill detection
3. Targeted recap lesson generation
4. Frontend review queue UI and completion flow

Acceptance criteria:

1. Weak areas are automatically surfaced and practiced.
2. Retention score is measurable over time.

---

## Phase 9 - Gamification tied to communication quality

Objective:
Add motivational systems that reward real conversation ability.

Deliverables:

1. Conversation streak logic (not login streak)
2. Context stars and recovery badges
3. Readiness rank based on scenario outcomes
4. UI for reward display linked to skill evidence

Acceptance criteria:

1. Rewards are granted only when communication quality thresholds are met.
2. No reward path can be farmed via low-quality repetition.

---

## Phase 10 - Learning analytics and instructor view

Objective:
Provide actionable analytics for learner and mentor/instructor oversight.

Deliverables:

1. KPI endpoints and aggregated metrics pipeline
2. Learner dashboard for progress trends
3. Instructor/admin view for weak-skill patterns
4. Data export/report capability for review

Acceptance criteria:

1. KPI data updates from real attempt events.
2. Dashboard clearly highlights weak skills and recommended focus.

---

## Phase 11 - Stability, quality, and regression safety

Objective:
Harden system reliability while preserving model and feature behavior.

Deliverables:

1. Automated API/integration tests for conversation flows
2. Regression tests for scoring and progression rules
3. Error monitoring hooks and operational logging improvements
4. Performance and failure-handling improvements

Acceptance criteria:

1. Critical conversation flows pass automated tests.
2. App degrades gracefully on service/DB interruptions.

---

## Phase 12 - Content expansion and live iteration

Objective:
Ship tooling and workflow for adding new islands and scenarios safely.

Deliverables:

1. Content authoring format and validation rules
2. New island onboarding flow (content -> DB -> UI availability)
3. Experiment toggle system for feature trials
4. Iteration playbook based on learning outcomes

Acceptance criteria:

1. Team can add a new island without codebase instability.
2. Expansion remains aligned with conversation-first mission.

---

## Prompting format for each phase (use this with Claude)

For each phase, prompt Claude with:

1. Phase objective
2. Current codebase context
3. Hard constraints (do not break model code)
4. Required deliverables
5. Acceptance criteria
6. Output format (must include code edits)
7. Mandatory verification evidence

Implementation-only prompt contract:

1. Claude must modify code (backend and/or frontend) in the phase.
2. Claude must return exact files changed and why.
3. Claude must include DB changes when feature requires persistence.
4. Claude must include run/verification steps and expected results.
5. Claude must not return planning-only output.

Template:

1. "Implement Phase X from plan/claude-objectives-and-phases.md."
2. "Respect non-negotiable constraints."
3. "This phase is code implementation only; do not return planning-only output."
4. "Return changed files, DB changes, verification evidence, and unresolved risks."

## Final success definition

HandSpeak is successful when a beginner can enter with no ASL knowledge and reliably complete practical, multi-turn, common conversations through guided island progression and response-driven training.

## Feature expansion aligned to outcomes 1, 2, and 3

This section adds concrete feature candidates that directly reinforce:

1. Real conversational ASL skill
2. Island-based progression
3. Response behavior training (replying to prompts/statements)

### A. Conversation intelligence features (Outcome 1 + 3)

1. Intent Match Mode
   Learner must produce a response that matches intent, not only exact phrase matching.
   Example intent classes: confirmation, refusal, clarification, ask-back, emotional reaction.
2. Multi-turn conversation chains
   Practice sessions run as 3 to 6 linked turns.
   Scoring includes local correctness per turn and global coherence across the full exchange.
3. Situation Cards
   Every conversation is bound to a context card (school, store, commute, first meeting, help request).
   The same vocabulary can score differently depending on context appropriateness.
4. Clarification and repair drills
   System injects misunderstanding moments; learner must recover using repair responses.
   Required repair patterns: repeat, slow down, rephrase, confirm understanding.
5. Role Swap Mode
   Round A: learner responds to NPC.
   Round B: learner initiates prompt and handles NPC reply.
   This trains both receptive and expressive conversational control.

### B. Island progression features (Outcome 2 + 3)

1. Island Gate Challenges
   Island unlock is based on scenario conversation checks, not raw lesson completion counts.
2. Four-axis Island Mastery Meter
   Per-island mastery tracks: comprehension, response accuracy, timing fluency, repair ability.
   Progression requires minimum threshold on all four axes.
3. Island Boss Dialogues
   Each island ends with a branching conversation boss using realistic constraints and response pressure.
4. Adaptive Island Side Quests
   If learner underperforms in one response type, assign targeted mini-quests before next gate.
5. Cross-island Memory Trails
   Periodic mixed scenarios from older islands are inserted to prevent skill decay.

### C. Response behavior mechanics (Outcome 3 primary)

1. Reply Type Trainer
   Dedicated training for response categories:
   confirm, deny, clarify, ask-back, react, repair, close conversation.
2. Response Builder
   Learner constructs reply plan before signing:
   intent -> key sign payload -> modifier/emotion -> close.
3. Consequence-based feedback
   System distinguishes:
   correct-and-natural, correct-but-awkward, context-mismatch, and meaning-mismatch.
4. Minimal Cue Response Mode
   Advanced mode removes explicit text and uses only scenario plus conversational cue.
5. Next Move Predictor
   Before signing, learner selects best next conversational move from options.
   Improves strategic conversation behavior.

### D. Gamification that reinforces learning outcomes (Outcome 1 + 2 + 3)

1. Conversation Streak
   Streak increases only when multi-turn exchanges remain coherent and context-appropriate.
2. Context Stars
   Bonus stars for socially and contextually appropriate replies.
3. Recovery Badges
   Badges for successful misunderstanding recovery and conversation repair.
4. Readiness Rank
   Rank progression based on scenario readiness (intro, help request, small talk, directions, polite closure).
5. Dialogue Combo Bonus
   Reward chaining diverse response types in one exchange (answer + clarify + ask-back + close).

### E. Priority implementation set (recommended first 5)

1. Multi-turn conversation chains
2. Island Gate Challenges
3. Clarification and repair drills
4. Four-axis Island Mastery Meter
5. Consequence-based feedback

### F. Acceptance criteria for this feature expansion

1. Each implemented feature must map to at least one outcome (1, 2, or 3) with explicit traceability.
2. At least 60% of practice time should involve response behavior, not isolated sign recall.
3. Island progression must require demonstrated response skill, not only completion volume.
4. Feedback must explain why a response is weak and how to correct it.
5. Metrics must capture improvement in multi-turn conversation quality over time.
