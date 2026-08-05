# pi-template-bridge

Unified development workflow for Pi: **Superpowers + Beads + Templates**.

## Prerequisites

- [Superpowers](https://github.com/obra/superpowers) — `pi install git:github.com/obra/superpowers`
- [Beads](https://github.com/steveyegge/beads) — install from releases

## Install

```bash
pi install git:github.com/spells3/pi-template-bridge
```

## What's Inside

| Component | Type | Purpose |
|-----------|------|---------|
| `unified-workflow` | Skill | 9-step workflow: beads task -> brainstorm -> plan -> TDD -> review -> finish |
| `template-catalog` | Skill | 421 specialist agents on-demand |
| extension | Auto-loaded | Injects `bd prime` context at session start and after compaction |

## Commands

| Command | Action |
|---------|--------|
| `/bd-prime` | Re-inject Beads context manually |
| `/bd-create <title>` | `bd create "<title>"` |
| `/bd-ready` | `bd ready` — show claimable work |
| `/bd-list` | `bd list` — open issues |
| `/bd-show <id>` | `bd show <id>` |
| `/bd-close <id>` | `bd close <id>` |
| `/browse-templates` | Instructions to run `npx claude-code-templates@latest` |

## The Flow

```
1. EPIC        bd create -t epic "Goal"
2. BRAINSTORM  /skill:unified-workflow -> superpowers:brainstorming
3. PLAN        superpowers:writing-plans
4. ISOLATE     superpowers:using-git-worktrees
5. IMPLEMENT   bd ready -> claim -> TDD (RED -> GREEN -> REFACTOR) -> commit
6. REVIEW      superpowers:requesting-code-review
7. VERIFY      superpowers:verification-before-completion
8. FINISH      superpowers:finishing-a-development-branch
9. CLOSE       bd close <epic-id> --reason "Done"
```

## Updating template-catalog

The catalog table is a static copy. To refresh after upstream changes:

```bash
curl -s "https://raw.githubusercontent.com/maslennikov-ig/template-bridge/main/skills/template-catalog/SKILL.md" \
  > skills/template-catalog/SKILL.md
# Edit frontmatter description if needed, then commit.
```
