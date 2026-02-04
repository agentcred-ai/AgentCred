# AgentCred Setup for OpenClaw

This guide helps you set up your AgentCred identity for the first time.

## Prerequisites

- GitHub account
- GitHub Personal Access Token with `read:user` scope

## Step 1: Get GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "AgentCred for OpenClaw"
4. Select scope: `read:user` (to verify your GitHub username)
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

## Step 2: Set Environment Variable

Add your GitHub token to your environment:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

To make it permanent, add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
echo 'export GITHUB_TOKEN="ghp_your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

## Step 3: Initialize Identity

Run the init command:

```bash
npx @agentcred-ai/cli init --json
```

Expected output:
```json
{
  "username": "yourname",
  "fingerprint": "abc123...",
  "registeredAt": "2026-02-01T12:00:00.000Z"
}
```

This creates:
- An Ed25519 keypair (private key stored locally at `~/.agentcred/keys/yourname.jwk`)
- A public key registered at `api.agentcred.dev`

## Step 4: Verify Setup

Check your identity:

```bash
npx @agentcred-ai/cli whoami --json
```

You should see your GitHub username and fingerprint.

## Security Notes

### Private Key Protection
- **Never share**: The `.jwk` files in `~/.agentcred/keys/` contain your private key. NEVER share them with anyone.
- **Exclude from cloud sync**: Remove `~/.agentcred/` from Dropbox, iCloud Drive, Google Drive, OneDrive, or any cloud sync service.
- **Exclude from git**: Ensure your `.gitignore` includes `.agentcred/`. Never commit key files.
- **Encrypt backups**: If you must back up your key, encrypt it first (e.g., `gpg -c ~/.agentcred/keys/username.jwk`).
- **File permissions**: Key files are created with `0600` (owner read/write only). Do not change permissions to be more permissive.

### GitHub Token Management
- **Minimum scope**: Only `read:user` scope is required. Do NOT use tokens with broader permissions.
- **Safe after init**: The token is only used during `init` to verify your GitHub identity. After init completes, sign/verify work without it.
  ```bash
  # You can safely unset after init:
   unset GITHUB_TOKEN
  ```
- **Revoke on exposure**: If your token is ever exposed, immediately revoke it at https://github.com/settings/tokens and generate a new one.
- **Avoid shell history**: Using `--token ghp_xxx` directly leaves the token in shell history. Prefer the environment variable method:
  ```bash
  # Good: environment variable (not in history)
   export GITHUB_TOKEN="ghp_xxx"
  npx @agentcred-ai/cli init
  
  # Avoid: inline token (saved in history)
  npx @agentcred-ai/cli init --token ghp_xxx
  ```

### Key Compromise Response
If you suspect your private key has been compromised:
1. **Generate new key immediately**: Run `npx @agentcred-ai/cli init` to create a new keypair (this replaces the old key on the API server)
2. **Revoke GitHub PAT**: If the PAT was also compromised, revoke it at https://github.com/settings/tokens
3. **Notify affected parties**: If signed content was distributed, inform recipients that old signatures may be compromised
4. **Review signed content**: Check what was signed with the old key and assess impact

### Signed Content Validity
- Signatures are valid for **24 hours** from creation (per protocol spec)
- After 24 hours, verification will fail with "Timestamp outside valid window"
- This is by design to prevent long-term replay of old signatures

## Troubleshooting

### Error: "GitHub token is required"

Make sure `GITHUB_TOKEN` environment variable is set:
```bash
echo $GITHUB_TOKEN
```

### Error: "Failed to verify GitHub token"

Your token might be invalid or expired. Generate a new one at https://github.com/settings/tokens

### Error: "Network error"

Check your internet connection. AgentCred needs to connect to:
- `api.github.com` (to verify your token)
- `api.agentcred.dev` (to register your public key)

## Next Steps

Once setup is complete, return to `SKILL.md` to learn how to sign and verify content.
