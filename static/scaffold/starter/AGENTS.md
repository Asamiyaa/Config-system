# Creative Frontend Contract for Codex

This project uses the **Creative Frontend Starter**. Follow these rules for every UI, animation, design-system, or interaction change.

## Required reading before coding
1. `.agents/PROJECT_ADAPTATION.md` — actual repository stack and safe integration notes.
2. `.agents/design/UX_FOUNDATIONS.md` — primary tasks, 2–3 step reachability, reduced clutter, action feedback.
3. `.agents/design/DESIGN_SYSTEM.md` — typography, grid, colors, content hierarchy, anti-patterns.
4. `.agents/design/MOTION_SPEC.md` — motion tokens, continuity, interruption, accessibility.
5. `.agents/design/INTERACTION_BLUEPRINT.md` — state machine and cinematic scene planning.
6. `.agents/design/TECH_PLAYBOOK.md` — stack-specific implementation choice.
7. `.agents/design/VISUAL_QA.md` — browser-based acceptance and evidence.

## Priorities
**Task completion > readability > hierarchy > feedback > purposeful interaction > effects.** Do not use 3D just because the stack supports it. Every animation must be directly initiated by a user action and communicate state, causality, or spatial relation.

## Execution contract
- **Discover**: inspect source, dependencies, routing, existing styles, and the three priority user task flows; identify where feature pile-up, information overload, or inconsistent design harms usability. Describe the visual direction in 3–5 lines.
- **Plan**: name one primary action/focal point per view, map click/tap paths and action feedback; state motion beats, entry/exit states, reduced-motion behavior, testing approach.
- **Prototype**: implement one representative, reversible, shared-element interaction with explicit user trigger and paired reverse before applying a pattern across the app.
- **Implement**: preserve existing data sources, API contracts, URL behavior, user operations, and error handling.
- **Verify**: run the app in a browser, inspect screenshots, exercise actual core task journeys and action feedback, check reversible motion and idle stillness, test narrow/mobile views, report errors and fixes.
- **Report**: name changed files, validations performed, screenshots/output paths, known gaps. Do not call untested work "verified".

## Agent roles (one agent may perform all)
- Art Director: unique identity, layout, typography, contrast and restraint.
- Motion Director: timeline choreography, spatial continuity, interruption.
- Creative Engineer: correct stack, performance budget, fallbacks.
- Visual QA: screenshot critique, functional regression, keyboard, reduced motion.

## Non-negotiables
- No purple-gradient / identical-rounded-card default template aesthetics.
- No feature-shelf homepage, overloaded screens, or inconsistent UI conventions; routine core tasks should usually be reachable in 2–3 steps, except justified workflows.
- No silent action: instant press/selection feedback, truthful pending/success/error states, undo or retry when applicable.
- No unsolicited animated entrance, background breathing, idle particle effect, autoplay carousel or scene loop.
- Opening and closing a shared element must use the same anchor, path, duration and easing; no mechanical linear constant-speed movement or exaggerated spring.
- Motion is layered: primary container first, subordinate content afterward; micro feedback is subtle and immediate.
- Do not hide essential information behind animation, hover or WebGL.
- Respect `prefers-reduced-motion`; ensure keyboard and touch reach core actions.
- Pause and/or remove costly loops when not visible; clean up listeners and animation instances.
- No fabricated mock market data or silent API fallbacks in production data views.
- Never override configuration or an existing AGENTS.md without explicit instructions.
- If requested quality requires unavailable assets, tooling, or privileges, implement the strongest honest fallback and state the limitation.

## Short commands for new tasks
Start with `.agents/prompts/01_DESIGN_BRIEF.md` to define direction. Use `02_BUILD.md` for implementation; `03_VISUAL_CRITIQUE.md` for a second pass; `04_CINEMATIC_SCENE.md` when true spatial storytelling is justified.

## Definition of done
A build passing is **not** visual QA. Complete the scenario checklist in `.agents/checklists/RELEASE_CHECKLIST.md` and supply concrete evidence.

## Detailed reusable interaction scenario library (v2.0)

**Before implementing any frontend interaction:**

1. Read `.agents/scenarios/AUTO_SELECTION.md` and `.agents/scenarios/COMPOSITION_RULES.md`.
2. Run `python tools/pick_scenario.py "交互业务需求"` or browse `.agents/scenarios/INDEX.md`.
3. Choose **one primary** recipe and at most **two supplemental** recipes; read each applicable `.md` **in full**. Available: 104 scenario contracts in 10 categories, including the original exact 01/02/03 instructions.
4. Fill `.agents/design/SCENARIO_PROMPT_SCHEMA.md` with actual component IDs, start/end geometry, easing/time, interruption, fallback, business constraints and QA assertions.
5. Implement in the actual repository, not just a demo. Test actual forward/reverse/interrupt, screen reader semantics, touch/keyboard, reduced-motion and mobile, then report real evidence.

`catalog.json` plus `tools/pick_scenario.py` are keyword search helpers only, not a replacement for domain reasoning or repo inspection. Do not blindly apply every recipe, add unnecessary dependencies, or pretend all scenario docs have runnable code.

## AI Learn Studio / Codex Skills
- `$creative-frontend-director`: design and visual QA.
- `$interaction-recipe-executor`: 104 precise interaction recipes.
- `$ailearn-knowledge-curator`: capture, classify, export and sync new lessons.
- `.agents/design/AI_LEARN_KNOWLEDGE_ARCHITECTURE.md`: original source mapping and learning workflow.
- Only claim tested interactions; original screenshot is not behavioral evidence.
