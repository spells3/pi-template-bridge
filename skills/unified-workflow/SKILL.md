---
name: unified-workflow
version: 1.0.0
description: >
  Unified development methodology for Pi: Superpowers + Beads + Templates.
  TRIGGER: At session start, before any task, or when workflow is unclear.
  Defines the mandatory flow: beads task -> brainstorm -> plan -> TDD -> review -> finish.
---

# Unified Development Workflow

## The Stack

| System | Role | Type |
|--------|------|------|
| **Superpowers** | Development methodology (HOW to work) | Pi package, skills |
| **Beads** | Task tracking (WHAT to work on) | CLI (`bd`) |
| **Template Bridge** | Specialist agents (WHO helps) | On-demand from claude-code-templates |

## The Mandatory Flow

```
Task arrives
    |
    +- 1. EPIC: bd create -t epic "High-level goal"
    |       (container: tracks intent, holds lock, preserves context)
    |
    +- 2. BRAINSTORM: read superpowers:brainstorming SKILL.md -> design before code
    |
    +- 3. PLAN: read superpowers:writing-plans SKILL.md -> 2-5 min tasks
    |
    +- 4. SUB-TASKS: create concrete tasks from the plan
    |       bd create "Sub-task 1" -t task
    |       bd dep add sub-task-1 epic-id --type parent-child
    |       bd dep add sub-task-2 sub-task-1   (sequential -> blocks)
    |
    +- 5. ISOLATE: read superpowers:using-git-worktrees SKILL.md (non-trivial work)
    |
    +- 6. IMPLEMENT: bd ready -> pick from Ready Front -> bd update <id> --claim
    |       For each sub-task:
    |       +- TDD: RED -> verify fail -> GREEN -> verify pass -> REFACTOR
    |       +- Commit after each green
    |       +- read superpowers:requesting-code-review SKILL.md
    |       +- bd close <sub-id> --reason "Done"
    |           (closing auto-unblocks next Ready Front)
    |
    +- 7. VERIFY: read superpowers:verification-before-completion SKILL.md
    |
    +- 8. FINISH: read superpowers:finishing-a-development-branch SKILL.md
    |
    +- 9. CLOSE: bd close <epic-id> --reason "Done"
```

## Pi Tool Mapping

Pi native tools: `read`, `write`, `edit`, `bash`. Use these for all file and shell actions.

When a Superpowers skill is needed: use `read` to load the relevant SKILL.md file.
Skill paths are registered by the template-bridge extension — load them with `read`.

Pi does not have a built-in task-list tool. Use `bd` via `bash` or the `/bd-*` commands.

## Task Decomposition with Beads Dependencies

**Four dependency types** (only `blocks` affects `bd ready`):

| Type | Effect on `bd ready` | Use when |
|------|---------------------|----------|
| **blocks** | YES — blocked task hidden from `bd ready` | Sequential work, prerequisites |
| **parent-child** | No | Epic -> sub-task structure |
| **related** | No | Connected but independent work |
| **discovered-from** | No | Side-quest found during implementation |

Direction rule: "X needs Y" -> `bd dep add X Y`

Side quests:
```bash
bd create "Found: missing input validation" -t bug
bd dep add new-id current-id --type discovered-from
```

## TDD: Red-Green-Refactor (no exceptions)

1. **RED**: Write ONE failing test for desired behavior
2. **VERIFY RED**: Run it. Must fail for the RIGHT reason
3. **GREEN**: Write minimal code to pass
4. **VERIFY GREEN**: All tests pass
5. **REFACTOR**: Clean up, tests still pass
6. **COMMIT** after each green cycle

No production code without a failing test first. Ever.

## Debugging (mandatory)

Read superpowers:systematic-debugging SKILL.md BEFORE any fix attempt:

1. Root cause investigation (read errors, reproduce, check recent changes)
2. Pattern analysis (find working examples, compare)
3. Hypothesis + single-variable test
4. Fix with failing test first
5. Stop after 3 failed attempts -> question architecture

## Verification Gate (mandatory)

Before claiming ANYTHING done, read superpowers:verification-before-completion SKILL.md:

1. Identify the proving command
2. Run it fresh (not cached)
3. Read complete output + exit code
4. Verify output supports claim
5. Only then claim done

Evidence before claims, always.

## When to Pull External Templates

Check template-bridge:template-catalog when task needs a specialist NOT in:
- Current project skills
- Superpowers skills (brainstorming, TDD, debugging, code-review, etc.)
- Beads (task tracking)

Install fresh:
```bash
npx claude-code-templates@latest --agent <category/name> --yes
```

Or use `/browse-templates` Pi command.

## Key Superpowers Skills Reference

| Skill | When | Type |
|-------|------|------|
| `brainstorming` | Before ANY creative/feature work | Rigid |
| `writing-plans` | After brainstorm approval | Rigid |
| `test-driven-development` | During ALL implementation | Rigid |
| `systematic-debugging` | Any bug/test failure | Rigid |
| `verification-before-completion` | Before claiming done | Rigid |
| `using-git-worktrees` | Non-trivial feature work | Flexible |
| `requesting-code-review` | After each task | Flexible |
| `finishing-a-development-branch` | Tests pass, ready to merge | Rigid |

## Beads Quick Reference

```bash
bd create -t epic "Goal"          # create epic
bd create "Task" -t task          # create sub-task
bd dep add child parent --type parent-child
bd dep add blocked blocker        # blocks dependency
bd ready                          # show claimable work
bd update <id> --claim            # atomically start work
bd close <id> --reason "Done"     # mark done, auto-unblocks dependents
bd list --status in_progress      # session recovery
bd show <id>                      # issue details
bd prime                          # full workflow context
```

## Anti-Patterns (never)

- Skip brainstorming ("just code it")
- Write code before failing test
- Claim "fixed" without running verification command
- Work without a beads task
- Multiple simultaneous fixes
- Trust subagent reports without own verification
- Qualifier language ("should work", "probably fixed")
