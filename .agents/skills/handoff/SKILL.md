---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

**Save it to `~/.dsh/handoffs/` — resolved on this machine as `C:/Users/Zubaydulla/.dsh/handoffs/`.**

Do **NOT** use the OS temporary directory, and do **NOT** use the current workspace:

- **Not the OS temporary directory.** This was the previous instruction, and it is wrong on this machine. The temp directory was cleared mid-project on 2026-09-24 and silently destroyed a completed handoff — a reboot, a cleanup tool, or a disk-pressure sweep wipes it without warning. A handoff is the one artifact the next session depends on; it must outlive a temp cleanup.
- **Not the workspace.** The handoff describes work that may not be committed yet, and the next session must not treat it as project content. It also pollutes `git status` for the agent that follows, which is exactly the noise the process exists to avoid.

`~/.dsh/handoffs/` is durable profile storage that the DSH harness itself maintains, alongside `~/.dsh/sessions/`, `~/.dsh/attachments/`, and `~/.dsh/rewind-snapshots/`. Those directories survived the very cleanup that destroyed the temp-based handoff, so this location is the proven-durable choice. It is outside the repo and version-controlled by nobody but the user, which is the intent.

Use the filename convention `handoff-<project>-after-<finding-or-topic>.md`, e.g. `handoff-mahalla-ovozi-after-L3-P04-01.md`.

When a new handoff supersedes an older one, name the older file in the new document's header, mark it superseded, and leave it on disk. Do not silently delete it.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
