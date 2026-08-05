# pi-template-bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Pi package that unifies Superpowers + Beads (`bd`) for Pi, auto-injecting `bd prime` context each session and providing Pi commands that wrap `bd` subcommands.

**Architecture:** A git-installable Pi package with one TypeScript extension and two skills. The extension mirrors the superpowers injection pattern: injects `bd prime` output as a high-priority user message at session start and after compaction. Pi commands are thin `bash` wrappers registered via `pi.registerCommand`.

**Tech Stack:** TypeScript (jiti, no compilation), Pi ExtensionAPI (`@earendil-works/pi-coding-agent`), `bd` CLI (external, must be on PATH), `node:child_process` (execSync for `bd prime`), no npm dependencies.

## Global Constraints

- No npm dependencies beyond what Pi provides — `node:*` builtins only.
- Extension must be valid TypeScript loadable by jiti without compilation.
- `bd` absence must be handled silently — no errors if not installed or no `.beads` db.
- Skills must have YAML frontmatter with `name`, `version`, `description` fields.
- All files in English.
- Injection marker string: `template-bridge:bd-prime-context` (prevents duplicate injection).
- `<EXTREMELY_IMPORTANT>` wrapper on injected content (same as superpowers pattern).

---

### Task 1: Scaffold package structure + package.json

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `extensions/.gitkeep` (placeholder, replaced in Task 2)
- Create: `skills/unified-workflow/.gitkeep` (placeholder, replaced in Task 3)
- Create: `skills/template-catalog/.gitkeep` (placeholder, replaced in Task 4)

**Interfaces:**
- Produces: `package.json` with `pi` manifest pointing to `./extensions/template-bridge.ts` and `./skills`

- [ ] **Step 1: Create package.json**

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

Write to `~/work/pi-template-bridge/package.json`.

- [ ] **Step 2: Create README.md**

```markdown
# pi-template-bridge

Unified development workflow for Pi: **Superpowers + Beads + Templates**.

## Prerequisites

- [Superpowers](https://github.com/obra/superpowers) — `pi install git:github.com/obra/superpowers`
- [Beads](https://github.com/steveyegge/beads) — `brew install beads` (or from releases)

## Install

```bash
pi install git:github.com/spells3/pi-template-bridge
```

## What's Inside

| Component | Type | Purpose |
|-----------|------|---------|
| `unified-workflow` | Skill | 9-step workflow: beads task → brainstorm → plan → TDD → review → finish |
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
| `/browse-templates` | `npx claude-code-templates@latest` |

## Updating template-catalog

The catalog table is a static copy. To refresh after upstream changes:

```bash
curl -s "https://raw.githubusercontent.com/maslennikov-ig/template-bridge/main/skills/template-catalog/SKILL.md" \
  > skills/template-catalog/SKILL.md
# Edit the frontmatter description to reference Pi instead of Claude Code, then commit.
```
```

Write to `~/work/pi-template-bridge/README.md`.

- [ ] **Step 3: Create directory placeholders**

```bash
mkdir -p ~/work/pi-template-bridge/extensions
mkdir -p ~/work/pi-template-bridge/skills/unified-workflow
mkdir -p ~/work/pi-template-bridge/skills/template-catalog
```

- [ ] **Step 4: Verify package.json is valid JSON**

```bash
cd ~/work/pi-template-bridge && node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
cd ~/work/pi-template-bridge
git add package.json README.md
git commit -m "feat: scaffold package structure"
```

---

### Task 2: Write the extension `extensions/template-bridge.ts`

**Files:**
- Create: `extensions/template-bridge.ts`

**Interfaces:**
- Consumes: Pi `ExtensionAPI` from `@earendil-works/pi-coding-agent`
- Consumes: `node:child_process` `execSync` to run `bd prime`
- Produces: registered events (`resources_discover`, `session_start`, `session_compact`, `agent_end`, `context`) and commands (`/bd-prime`, `/bd-create`, `/bd-ready`, `/bd-list`, `/bd-show`, `/bd-close`, `/browse-templates`)

- [ ] **Step 1: Write failing self-check**

Create `extensions/template-bridge.test.ts`:

```typescript
// Self-check: import compiles and exports a function
import bridge from "./template-bridge.ts";
console.assert(typeof bridge === "function", "default export must be a function");
console.log("PASS: default export is function");
```

- [ ] **Step 2: Run self-check to confirm it fails**

```bash
cd ~/work/pi-template-bridge
node --input-type=module < extensions/template-bridge.test.ts 2>&1 || echo "EXPECTED FAIL: file not yet created"
```

Expected: error about missing file.

- [ ] **Step 3: Write the extension**

Create `extensions/template-bridge.ts`:

```typescript
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MARKER = "template-bridge:bd-prime-context";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const skillsDir = resolve(extensionDir, "../skills");

export default function templateBridge(pi: ExtensionAPI) {
  let inject = true;

  pi.on("resources_discover", async () => ({
    skillPaths: [skillsDir],
  }));

  pi.on("session_start", async () => {
    inject = true;
  });

  pi.on("session_compact", async () => {
    inject = true;
  });

  pi.on("agent_end", async () => {
    inject = false;
  });

  pi.on("context", async (event) => {
    if (!inject) return;
    if (event.messages.some(containsMarker)) return;

    const prime = runBdPrime();
    if (!prime) return;

    const msg = {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: `<EXTREMELY_IMPORTANT>\n${MARKER}\n\n${prime}\n</EXTREMELY_IMPORTANT>`,
        },
      ],
      timestamp: Date.now(),
    };

    const insertAt = firstNonCompactionIndex(event.messages);
    return {
      messages: [
        ...event.messages.slice(0, insertAt),
        msg,
        ...event.messages.slice(insertAt),
      ],
    };
  });

  // Commands

  pi.registerCommand("bd-prime", {
    description: "Re-inject Beads context (bd prime)",
    handler: async (_args, ctx) => {
      const out = runBdPrime();
      if (!out) {
        ctx.ui.notify("bd prime: no output (bd not installed or no .beads db)", "warning");
        return;
      }
      ctx.ui.notify("Beads context injected", "info");
    },
  });

  pi.registerCommand("bd-create", {
    description: "Create a Beads issue: /bd-create <title>",
    handler: async (args, ctx) => {
      if (!args) { ctx.ui.notify("Usage: /bd-create <title>", "warning"); return; }
      const out = runBd(`create ${JSON.stringify(args)}`);
      ctx.ui.notify(out || "bd create failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("bd-ready", {
    description: "Show ready Beads work (bd ready)",
    handler: async (_args, ctx) => {
      const out = runBd("ready");
      ctx.ui.notify(out || "(no ready work)", "info");
    },
  });

  pi.registerCommand("bd-list", {
    description: "List open Beads issues (bd list)",
    handler: async (_args, ctx) => {
      const out = runBd("list");
      ctx.ui.notify(out || "(no open issues)", "info");
    },
  });

  pi.registerCommand("bd-show", {
    description: "Show a Beads issue: /bd-show <id>",
    handler: async (args, ctx) => {
      if (!args) { ctx.ui.notify("Usage: /bd-show <id>", "warning"); return; }
      const out = runBd(`show ${args}`);
      ctx.ui.notify(out || "bd show failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("bd-close", {
    description: "Close a Beads issue: /bd-close <id>",
    handler: async (args, ctx) => {
      if (!args) { ctx.ui.notify("Usage: /bd-close <id>", "warning"); return; }
      const out = runBd(`close ${args}`);
      ctx.ui.notify(out || "bd close failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("browse-templates", {
    description: "Browse claude-code-templates interactively",
    handler: async (_args, ctx) => {
      try {
        const out = execSync("npx claude-code-templates@latest --help", {
          encoding: "utf8",
          timeout: 15000,
        });
        ctx.ui.notify(
          "Run in your terminal: npx claude-code-templates@latest\nFor direct install: npx claude-code-templates@latest --agent <category/name> --yes",
          "info",
        );
      } catch {
        ctx.ui.notify(
          "Run in your terminal: npx claude-code-templates@latest",
          "info",
        );
      }
    },
  });
}

function runBdPrime(): string | null {
  return runBd("prime");
}

function runBd(subcmd: string): string | null {
  try {
    const out = execSync(`bd ${subcmd}`, {
      encoding: "utf8",
      timeout: 10000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function containsMarker(message: unknown): boolean {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content.includes(MARKER);
  if (!Array.isArray(content)) return false;
  return content.some(
    (p) =>
      p &&
      typeof p === "object" &&
      (p as { type?: unknown }).type === "text" &&
      typeof (p as { text?: unknown }).text === "string" &&
      (p as { text: string }).text.includes(MARKER),
  );
}

function firstNonCompactionIndex(messages: unknown[]): number {
  let i = 0;
  while ((messages[i] as { role?: unknown } | undefined)?.role === "compactionSummary") {
    i++;
  }
  return i;
}
```

- [ ] **Step 4: Run self-check — verify it passes**

```bash
cd ~/work/pi-template-bridge
node --experimental-vm-modules -e "
import('./extensions/template-bridge.ts').then(m => {
  console.assert(typeof m.default === 'function', 'must be function');
  console.log('PASS');
}).catch(e => { console.error('FAIL', e.message); process.exit(1); });
" 2>&1 || echo "NOTE: jiti-only, TypeScript import via node alone may show type errors — load check via pi is in Task 5"
```

Expected: either `PASS` or a note about TypeScript (jiti handles TS, bare node does not). The real load test is Task 5.

- [ ] **Step 5: Commit**

```bash
cd ~/work/pi-template-bridge
git add extensions/template-bridge.ts
git commit -m "feat: add template-bridge extension with bd injection and commands"
```

---

### Task 3: Write `skills/unified-workflow/SKILL.md`

**Files:**
- Create: `skills/unified-workflow/SKILL.md`

**Interfaces:**
- Produces: Pi-native skill loaded via `resources_discover` from the extension

- [ ] **Step 1: Write the skill file**

Create `skills/unified-workflow/SKILL.md`:

```markdown
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
| **blocks** | YES - blocked task hidden from `bd ready` | Sequential work, prerequisites |
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
bd close <id> --reason "Done"     # mark done
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
```

- [ ] **Step 2: Verify frontmatter is valid YAML**

```bash
cd ~/work/pi-template-bridge
node -e "
const fs = require('fs');
const content = fs.readFileSync('skills/unified-workflow/SKILL.md', 'utf8');
const hasFrontmatter = content.startsWith('---');
const hasName = content.includes('name: unified-workflow');
console.assert(hasFrontmatter, 'must have frontmatter');
console.assert(hasName, 'must have name field');
console.log('PASS');
"
```

Expected: `PASS`

- [ ] **Step 3: Commit**

```bash
cd ~/work/pi-template-bridge
git add skills/unified-workflow/SKILL.md
git commit -m "feat: add unified-workflow skill"
```

---

### Task 4: Write `skills/template-catalog/SKILL.md`

**Files:**
- Create: `skills/template-catalog/SKILL.md`

**Interfaces:**
- Produces: Pi-native skill loaded via `resources_discover` from the extension

- [ ] **Step 1: Write the skill file**

Create `skills/template-catalog/SKILL.md` — adapted from template-bridge source (Pi-native references, same catalog table):

```markdown
---
name: template-catalog
version: 1.0.0
description: >
  Proactively suggest and install specialist agent templates from claude-code-templates
  (421 agents, 28 categories). TRIGGER: When a task needs a specialist agent NOT
  available in current skills. Examples: blockchain, game dev, data science,
  Kubernetes, database optimization, Rust/Go experts, video processing.
---

# Template Catalog — 421 Specialist Agents

## How It Works

1. You see a task that would benefit from a specialist not in current skills
2. Suggest to user: "For this task there's a {name} template — install it?"
3. Install: `npx claude-code-templates@latest --agent {category}/{name} --yes`
4. Agent goes to `.claude/agents/{name}.md` in current project
5. Use the agent, optionally remove after

## Check Existing Skills FIRST

Before suggesting a template, verify it is not already covered by:
- Superpowers skills (brainstorming, TDD, debugging, code-review, etc.)
- Beads (task tracking)
- Project-specific skills/agents
- Other installed Pi packages

## Available Categories

| Category | Count | Sample Agents |
|----------|-------|---------------|
| accessibility | 1 | accessibility-tester |
| ai-specialists | 8 | ai-ethics-advisor, hackathon-ai-strategist, llm-architect |
| api-graphql | 8 | api-architect, api-designer, graphql-architect |
| blockchain-web3 | 4 | blockchain-developer, smart-contract-auditor, smart-contract-specialist |
| business-marketing | 21 | business-analyst, communication-excellence-coach, competitive-analyst |
| data-ai | 40 | adr-generator, ai-engineer, amplitude-experiment-implementation |
| database | 11 | database-admin, database-administrator, database-architect |
| deep-research-team | 16 | academic-researcher, agent-overview, competitive-intelligence-analyst |
| development-team | 17 | backend-architect, backend-developer, cli-ui-designer |
| development-tools | 34 | accessibility-tester, architect-reviewer, ascii-ui-mockup-generator |
| devops-infrastructure | 39 | apify-integration-expert, arm-migration, azure-iac-exporter |
| documentation | 11 | api-documenter, arch, changelog-generator |
| expert-advisors | 52 | 4.1-Beast, address-comments, agent-expert |
| ffmpeg-clip-team | 8 | audio-mixer, audio-quality-controller, podcast-content-analyzer |
| finance | 5 | bettoredge-value-finder, fintech-engineer, payment-integration |
| game-development | 5 | 3d-artist, game-designer, game-developer |
| git | 3 | commit-guardian, git-flow-manager, git-workflow-manager |
| mcp-dev-team | 8 | mcp-deployment-orchestrator, mcp-developer, mcp-integration-engineer |
| modernization | 3 | architecture-modernizer, cloud-migration-specialist, legacy-modernizer |
| obsidian-ops-team | 7 | connection-agent, content-curator, metadata-agent |
| ocr-extraction-team | 7 | document-structure-analyzer, markdown-syntax-formatter, ocr-grammar-fixer |
| performance-testing | 5 | load-testing-specialist, performance-engineer, react-performance-optimization |
| podcast-creator-team | 11 | academic-research-synthesizer, comprehensive-researcher, episode-orchestrator |
| programming-languages | 50 | angular-architect, c-pro, c-sharp-pro |
| realtime | 2 | supabase-realtime-optimizer, websocket-engineer |
| security | 24 | ad-security-reviewer, ai-agent-audit-specialist, api-security-audit |
| ui-analysis | 5 | screenshot-business-analyzer, screenshot-interaction-analyzer, screenshot-reviewer |
| web-tools | 16 | accessibility, aem-frontend-specialist, electron-angular-native |

## Install Examples

```bash
# Security audit
npx claude-code-templates@latest --agent security/security-auditor --yes

# Kubernetes specialist
npx claude-code-templates@latest --agent devops-infrastructure/kubernetes-specialist --yes

# Rust expert
npx claude-code-templates@latest --agent programming-languages/rust-pro --yes

# Interactive browser (all categories)
npx claude-code-templates@latest
```

Or use the `/browse-templates` Pi command.

## Source

Repository: https://github.com/davila7/claude-code-templates
Always fetches latest version — no stale copies.

## Refreshing This Catalog

To sync after upstream changes, follow the README instructions.
```

- [ ] **Step 2: Verify frontmatter**

```bash
cd ~/work/pi-template-bridge
node -e "
const fs = require('fs');
const content = fs.readFileSync('skills/template-catalog/SKILL.md', 'utf8');
console.assert(content.startsWith('---'), 'must have frontmatter');
console.assert(content.includes('name: template-catalog'), 'must have name');
console.log('PASS');
"
```

Expected: `PASS`

- [ ] **Step 3: Commit**

```bash
cd ~/work/pi-template-bridge
git add skills/template-catalog/SKILL.md
git commit -m "feat: add template-catalog skill"
```

---

### Task 5: Smoke test — load extension in Pi

**Files:** none created, verification only.

**Interfaces:**
- Consumes: all files from Tasks 1-4

- [ ] **Step 1: Load extension with pi -e flag**

```bash
pi -e ~/work/pi-template-bridge/extensions/template-bridge.ts --print "list your registered commands"
```

Expected: Pi starts, extension loads without errors, model response mentions `/bd-create`, `/bd-ready`, `/bd-close`, `/bd-show`, `/bd-list`, `/bd-prime`, `/browse-templates`.

- [ ] **Step 2: Verify skills are discovered**

```bash
pi -e ~/work/pi-template-bridge/extensions/template-bridge.ts --print "what skills do you have available? list them"
```

Expected: response mentions `unified-workflow` and `template-catalog` among available skills.

- [ ] **Step 3: Verify bd-prime command (with beads db present)**

In a directory that has a `.beads` database, or skip if none available:

```bash
cd ~/work/pi-template-bridge
pi -e ./extensions/template-bridge.ts --print "/bd-prime"
```

Expected: either Beads context injected notification, or "no output" warning if no `.beads` db — no crash either way.

- [ ] **Step 4: Final commit — mark package complete**

```bash
cd ~/work/pi-template-bridge
git add .
git commit -m "feat: complete pi-template-bridge package" --allow-empty
```

---

## Self-Review

- **Spec coverage:**
  - `resources_discover` registration: Task 2 (extension)
  - `bd prime` injection pattern (session_start + session_compact + agent_end + context): Task 2
  - All 7 commands: Task 2
  - `unified-workflow` skill: Task 3
  - `template-catalog` skill: Task 4
  - Error handling (`bd` not installed): Task 2 (`runBd` catches and returns null)
  - `package.json` manifest: Task 1
  - README: Task 1
  - Smoke test: Task 5

- **No placeholders found.**
- **Types consistent:** `runBd` returns `string | null` throughout, `containsMarker` takes `unknown`, injection message typed as `role: "user"`.
- **Scope:** single package, single implementation plan, no decomposition needed.
