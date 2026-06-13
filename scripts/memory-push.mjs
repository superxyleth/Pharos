import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const summary = process.argv.slice(2).join(" ").trim();

if (!summary) {
  console.error("Usage: memory-push.cmd \"what changed in this push\"");
  process.exit(1);
}

const run = (cmd, args, options = {}) => {
  const output = execFileSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  return typeof output === "string" ? output.trim() : "";
};

const safeRun = (cmd, args) => {
  try {
    return run(cmd, args);
  } catch {
    return "";
  }
};

const assertGitRepo = () => {
  const inside = safeRun("git", ["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") {
    console.error("Not inside a Git repository. Run git init first.");
    process.exit(1);
  }
};

const assertSecretsUntracked = () => {
  const tracked = safeRun("git", ["ls-files", ".env", ".tools", ".ssh", ".codex"]);
  if (tracked) {
    console.error("Sensitive/local paths are tracked. Stop and untrack them before pushing:");
    console.error(tracked);
    process.exit(1);
  }
};

const branchName = () => {
  const branch = safeRun("git", ["branch", "--show-current"]);
  return branch || "main";
};

const hasCommits = () => safeRun("git", ["rev-parse", "--verify", "HEAD"]) !== "";

const shanghaiTimestamp = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
};

const slugify = (text) => {
  const ascii = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ascii || "memory";
};

const escapeMd = (text) => text.replace(/\r?\n/g, " ").trim();

assertGitRepo();
assertSecretsUntracked();

const statusBefore = safeRun("git", ["status", "--short"]) || "(clean)";
const beforeHead = hasCommits() ? safeRun("git", ["rev-parse", "--short", "HEAD"]) : "(initial)";
const branch = branchName();
const timestamp = shanghaiTimestamp();
const tag = `memory/${timestamp}-${slugify(summary)}`;

mkdirSync(path.join(root, "docs"), { recursive: true });
const logPath = path.join(root, "docs", "PUSH_LOG.md");
if (!existsSync(logPath)) {
  writeFileSync(
    logPath,
    "# Push Log\n\nThis file is updated by `memory-push.cmd` before each GitHub push.\n\n## Entries\n\n",
    "utf8",
  );
}

const entry = [
  `### ${timestamp} ${escapeMd(summary)}`,
  "",
  `- Branch: \`${branch}\``,
  `- Previous HEAD: \`${beforeHead}\``,
  `- Memory tag: \`${tag}\``,
  "- Executed:",
  "  - Updated `docs/PUSH_LOG.md`",
  "  - Staged current tracked and untracked safe files",
  "  - Created a Git commit",
  "  - Created an annotated memory tag",
  "  - Pushed branch and tags to `origin`",
  "- Workspace changes before push:",
  "```text",
  statusBefore,
  "```",
  "",
].join("\n");

const oldLog = readFileSync(logPath, "utf8");
writeFileSync(logPath, `${oldLog.trimEnd()}\n\n${entry}`, "utf8");

run("git", ["add", "-A"], { stdio: "inherit" });
assertSecretsUntracked();

const staged = safeRun("git", ["diff", "--cached", "--name-only"]);
if (!staged) {
  console.log("No staged changes to commit after updating push log.");
  process.exit(0);
}

const commitMessage = `chore: memory point ${timestamp} - ${summary}`;
run("git", ["commit", "-m", commitMessage], { stdio: "inherit" });

const newHead = run("git", ["rev-parse", "--short", "HEAD"]);
run("git", ["tag", "-a", tag, "-m", `Memory point ${timestamp}: ${summary}\n\nCommit: ${newHead}`], {
  stdio: "inherit",
});

run("git", ["push", "-u", "origin", branch, "--follow-tags"], { stdio: "inherit" });

console.log(`Memory point pushed: ${tag} -> ${newHead}`);
