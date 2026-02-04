import { createIdentity, loadIdentity, sign, verify, MemoryKeyStorage } from '@agentcred-ai/sdk';

/**
 * AgentCred Basic Signing Example
 * 
 * This example demonstrates the full lifecycle of an AgentCred credential:
 * 1. Creating a new identity (linked to a GitHub account)
 * 2. Signing content on behalf of an agent
 * 3. Verifying the signature offline using the public key
 */

async function main() {
  console.log('--- AgentCred Basic Signing Example ---');

  // 1. Setup identity
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('Missing GITHUB_TOKEN. Run: npx @agentcred-ai/cli init --token <token> or export GITHUB_TOKEN');
    return;
  }

  // Use MemoryKeyStorage so no files are written to disk.
  const config = {
    storage: new MemoryKeyStorage(),
    apiUrl: env.AGENTCRED_API_URL,
  };

  console.log('Creating identity for GitHub token...');
  const identity = await createIdentity(githubToken, config);
  console.log(`Identity created for @${identity.github.username}`);

  const loaded = await loadIdentity(identity.github.username, config);
  if (!loaded) {
    console.error('Failed to load identity after creation.');
    return;
  }

  // 2. Sign content
  const content = "The quick brown fox jumps over the lazy dog. - Signed by an AI Agent";
  const agentName = "VerificationBot-v1";

  console.log('\nSigning content...');
  console.log(`Content: "${content}"`);
  console.log(`Agent: ${agentName}`);

  const envelope = await sign(content, {
    privateKey: loaded.privateKey,
    github: identity.github.username
  }, {
    agent: agentName
  });

  console.log('\nGenerated AgentCred Envelope:');
  console.log(JSON.stringify(envelope, null, 2));

  // 3. Verify content (Online)
  // Verification confirms that the content hasn't been tampered with
  // and was indeed signed by the holder of the registered public key.
  console.log('\nVerifying envelope...');

  const result = await verify(envelope, config);

  if (result.verified) {
    console.log('✅ Verification SUCCESSFUL');
    console.log(`Verified Operator: @${result.github?.username}`);
    console.log(`Verified Agent: ${result.agent}`);
    console.log(`Signed At: ${result.signedAt}`);
  } else {
    console.log('❌ Verification FAILED');
    console.log(`Reason: ${result.error}`);
  }
}

main().catch(console.error);
