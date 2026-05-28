# Portability: OpenClaw, Codex app, Claude Code, n8n

The Dooray skill should remain portable. Keep domain workflows and API wrappers in this package, but keep credentials outside Git.

## OpenClaw on Mac mini

Preferred credential source:

- macOS Keychain via `scripts/setup-keychain-token.sh`
- local config: `~/.config/dooray/config.json`

Useful command:

```bash
node scripts/dooray-api.mjs config
```

## Codex app

Codex app cannot use the Mac mini Keychain unless it is actually running on that Mac environment. Treat it as a separate execution environment.

Recommended shape:

- Put this skill package in a Git repo, or include it under a project path such as `skills/dooray/`.
- Add a short project `AGENTS.md` that tells Codex to read `skills/dooray/SKILL.md` for Dooray work.
- Provide credentials through the Codex app environment/secret settings, not files committed to Git.
- Use `DOORAY_API_TOKEN` or `DOORAY_API_TOKEN_FILE`.

Example project `AGENTS.md` snippet:

```markdown
For Dooray 게시글/업무/위키 work, read `skills/dooray/SKILL.md` first. Do not write to Dooray without explicit confirmation. Use `DOORAY_API_TOKEN` from the environment for API access.
```

Example command inside the Codex app environment:

```bash
DOORAY_API_TOKEN="$DOORAY_API_TOKEN" node skills/dooray/scripts/dooray-api.mjs config
```

Constraints:

- Network access to the Dooray API must be available from the Codex app runtime.
- If Dooray is company-network-only, use OpenClaw/Mac mini or n8n inside the company network instead.
- Do not paste tokens into chat. Configure them as environment secrets when possible.

## Claude Code

Use the same repo layout as Codex app. Claude Code can read `AGENTS.md`/project docs and run scripts locally if permissions allow.

Credential options:

1. `DOORAY_API_TOKEN` environment variable
2. `DOORAY_API_TOKEN_FILE` pointing to a local untracked file
3. macOS Keychain when running on macOS

## n8n

Use n8n credentials for Dooray API tokens and webhook URLs. OpenClaw should help design/audit the workflow, but the scheduled collection/sending should run in n8n when that is the chosen operating model.

## Repo hygiene

Commit:

- `SKILL.md`
- `references/*.md`
- `scripts/*.mjs` / safe setup scripts

Do not commit:

- `.env`
- token files
- raw Dooray exports
- private API responses
- logs containing company content
