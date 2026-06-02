# Portability: OpenClaw, Codex app/CLI, Claude Code, n8n

The Dooray skill should remain portable. Keep domain workflows and API wrappers in this package, but keep credentials outside Git.

## Credential strategy

Credential lookup is intentionally tool-agnostic:

1. `DOORAY_API_TOKEN`
2. `DOORAY_API_TOKEN_FILE` or `config.tokenFile`
3. OS credential store through optional `keytar`

Use env/secret injection for Codex app, Codex CLI, Claude Code, CI, or n8n-style runners. Use the OS credential store for long-lived local desktops:

- macOS: Keychain
- Windows: Credential Manager
- Linux: Secret Service/libsecret

Useful checks:

```bash
node scripts/dooray-api.mjs config
node scripts/dooray-api-check.mjs --json
```

Windows wrappers:

```bat
scripts\dooray-api.cmd config
scripts\dooray-api-check.cmd --json
```

## OpenClaw

OpenClaw can use any credential source available to the host. On a personal Mac mini, the OS credential store is convenient; on other nodes, use environment secrets or a token file outside Git.

```bash
node scripts/setup-token.mjs dooray-api-token default
```

## Codex app and Codex CLI

Codex app/CLI cannot use another machine's OS credential store. Treat each execution environment as separate.

Recommended shape:

- Put this skill package in a Git repo, or include it under a project path such as `skills/dooray-api/`.
- Add a short project `AGENTS.md` that tells Codex to read `skills/dooray-api/SKILL.md` for Dooray work.
- Provide credentials through the Codex app environment/secret settings, not files committed to Git.
- Use `DOORAY_API_TOKEN` or `DOORAY_API_TOKEN_FILE`.

Example project `AGENTS.md` snippet:

```markdown
For Dooray API-supported 게시글/업무/위키 work, read `skills/dooray-api/SKILL.md` first. Do not write to Dooray without explicit confirmation. Use `DOORAY_API_TOKEN` from the environment for API access.
```

Example command inside the Codex environment:

```bash
DOORAY_API_TOKEN="$DOORAY_API_TOKEN" node skills/dooray-api/scripts/dooray-api.mjs config
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
3. OS credential store when running on a desktop where `keytar` is installed

Windows users can call the `.cmd` wrappers or run `node scripts\dooray-api.mjs ...` directly.

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
