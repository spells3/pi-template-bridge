# Design: pi-template-bridge

**Date:** 2026-08-05
**Install:** `pi install git:github.com/spells3/pi-template-bridge`
**Purpose:** Bridge Superpowers + Beads (`bd`) for Pi, mirroring template-bridge for Claude Code.

---

## Overview

A Pi package that unifies three layers:

| Layer | Tool | Role |
|-------|------|------|
| WHAT | Beads (`bd`) | Task tracking across sessions |
| HOW | Superpowers skills | TDD, brainstorming, debugging, code review |
| WHO | template-catalog skill | 413+ specialist agents on demand |

The extension auto-injects `bd prime` output into every session start and after compaction, so task context survives context resets. Pi commands wrap `bd` subcommands for use directly from chat.

---

## Repository Structure

```
pi-template-bridge/
├── package.json
├── README.md
├── extensions/
│   └── template-bridge.ts
└── skills/
    ├── unified-workflow/
    │   └── SKILL.md
    └── template-catalog/
        └── SKILL.md
```

---

## package.json

```json
{
  "name": "pi-template-bridge",
  "version": "1.0.0",
  "description": "Unified workflow for Pi: Superpowers + Beads + Templates",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions/template-bridge.ts"],
    "skills": ["./skills"]
  }
}
```

---

## Extension: `extensions/template-bridge.ts`

### Responsibilities

1. **`resources_discover`** — registers `./skills` so Pi loads both skills automatically.

2. **`bd prime` injection** — on `session_start` and `session_compact`, runs `bd prime` via `bash` and injects the output as a user message into the context (same pattern as superpowers bootstrap injection). If `bd` is not installed or no `.beads` database is found, silently skips.

3. **Pi commands** — thin wrappers that pass chat arguments straight to `bd` subcommands and display output via `ctx.ui.notify`.

### Commands

| Command | Runs | Purpose |
|---------|------|---------|
| `/bd-prime` | `bd prime` | Manual re-inject of Beads context |
| `/bd-create <title>` | `bd create "<title>"` | Create a new issue |
| `/bd-ready` | `bd ready` | Show claimable work |
| `/bd-list` | `bd list` | List open issues |
| `/bd-show <id>` | `bd show <id>` | Show issue details |
| `/bd-close <id>` | `bd close <id>` | Close an issue |
| `/browse-templates` | `npx claude-code-templates@latest` | Interactive template browser |

### Injection behavior

- `bd prime` stdout is wrapped in an `<EXTREMELY_IMPORTANT>` block (same as superpowers) so the model treats it as high-priority context.
- A marker string (`template-bridge:bd-prime`) prevents duplicate injection if the content is already present in the message history.
- If `bd prime` exits non-zero or produces empty output, injection is skipped silently.
- Re-injection is triggered on `session_start` (reason: any) and `session_compact`.

---

## Skill: `unified-workflow/SKILL.md`

9-step workflow adapted for Pi (tool names match Pi's native tools, not Claude Code):

```
1. EPIC        bd create -t epic "Goal"
2. BRAINSTORM  read superpowers:brainstorming SKILL.md → design before code
3. PLAN        read superpowers:writing-plans SKILL.md → 2-5 min tasks
4. ISOLATE     read superpowers:using-git-worktrees SKILL.md (non-trivial work)
5. IMPLEMENT   For each task:
               RED:     write ONE failing test
               VERIFY:  confirm fails for the right reason
               GREEN:   minimal code to pass
               VERIFY:  all tests pass
               REFACTOR clean up
               COMMIT
6. REVIEW      read superpowers:requesting-code-review SKILL.md
7. VERIFY      read superpowers:verification-before-completion SKILL.md
8. FINISH      read superpowers:finishing-a-development-branch SKILL.md
9. CLOSE       bd close <epic-id> --reason "Done"
```

Anti-patterns section (same as template-bridge):
- No production code without failing test first
- No completion claims without running verification commands
- No work without a beads task
- Multiple simultaneous fixes
- Qualifier language ("should work", "probably fixed")

Trigger description: `"Use before any task to load the full Superpowers + Beads workflow."`

---

## Skill: `template-catalog/SKILL.md`

Static catalog of 26 categories and top agents from `davila7/claude-code-templates`.

Install syntax:
```bash
npx claude-code-templates@latest --agent <category/name> --yes
```

Trigger description: `"Use when a specialist agent is needed that no existing skill covers."`

Skill content includes:
- When to use (task needs a domain specialist not in current skills)
- Full category table (26 categories, top agents per category)
- Install and browse commands
- Note: use `/browse-templates` Pi command for interactive browsing

---

## Error Handling

- `bd` not on PATH: skip all `bd prime` injection, commands show "bd not found, install from github.com/steveyegge/beads".
- No `.beads` database in cwd: `bd prime` exits non-zero, injection skipped silently.
- `npx` not available: `/browse-templates` shows error message via `ctx.ui.notify`.

---

## Out of Scope

- Beads MCP server integration (not needed, CLI is sufficient)
- Auto-sync of template-catalog from upstream (manual update via README instruction)
- Custom TUI for beads issue list (standard bash output is enough)
