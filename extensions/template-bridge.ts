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

    const prime = runBd("prime");
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

  pi.registerCommand("bd-prime", {
    description: "Re-inject Beads context (bd prime)",
    handler: async (_args, ctx) => {
      const out = runBd("prime");
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
      if (!args) {
        ctx.ui.notify("Usage: /bd-create <title>", "warning");
        return;
      }
      const out = runBd(`create ${JSON.stringify(args)}`);
      ctx.ui.notify(out ?? "bd create failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("bd-ready", {
    description: "Show ready Beads work (bd ready)",
    handler: async (_args, ctx) => {
      const out = runBd("ready");
      ctx.ui.notify(out ?? "(no ready work)", "info");
    },
  });

  pi.registerCommand("bd-list", {
    description: "List open Beads issues (bd list)",
    handler: async (_args, ctx) => {
      const out = runBd("list");
      ctx.ui.notify(out ?? "(no open issues)", "info");
    },
  });

  pi.registerCommand("bd-show", {
    description: "Show a Beads issue: /bd-show <id>",
    handler: async (args, ctx) => {
      if (!args) {
        ctx.ui.notify("Usage: /bd-show <id>", "warning");
        return;
      }
      const out = runBd(`show ${args}`);
      ctx.ui.notify(out ?? "bd show failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("bd-close", {
    description: "Close a Beads issue: /bd-close <id>",
    handler: async (args, ctx) => {
      if (!args) {
        ctx.ui.notify("Usage: /bd-close <id>", "warning");
        return;
      }
      const out = runBd(`close ${args}`);
      ctx.ui.notify(out ?? "bd close failed", out ? "info" : "error");
    },
  });

  pi.registerCommand("browse-templates", {
    description: "Browse claude-code-templates (npx claude-code-templates@latest)",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "Run in your terminal:\n  npx claude-code-templates@latest\n\nDirect install:\n  npx claude-code-templates@latest --agent <category/name> --yes",
        "info",
      );
    },
  });
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
