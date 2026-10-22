# AGENTS.md

Shared rules, skills, and workflows for this project live in `.agents/`.
`sync-agents sync` delivers them to each tool's native location. If your tool
has not loaded them, read the files in `.agents/rules/` that apply to your task.

## Project

A grab bag of small, standalone scripts, mostly bash for macOS, under `bash/`.
Each script documents its own usage in its header comment or a README next to it.

## Ground rules

- Never commit secrets, PII, usernames, or machine names. Use `$HOME` or
  relative paths instead of `/Users/<name>/...`. See `.agents/rules/snippets.md`.
- Put throwaway scripts in `./tmp/` (gitignored).
- Open TODOs live in `.agents/TODO.md`.
