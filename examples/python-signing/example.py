"""
AgentCred Python Usage Example

Sign and verify content using the Python wrapper.
Requires Node.js 18+ (used internally via npx).

Prerequisites:
  pip install agentcred
  npx @agentcred-ai/cli init --token ghp_your_token
"""
from agentcred import sign, verify, whoami


def main():
    # Check identity
    me = whoami()
    print(f"Signed in as: {me['username']}")

    # Sign agent output (1 line)
    envelope = sign("Analysis complete: Q4 revenue up 15%", agent="analyst-bot")
    print(f"Signed! JWS: {envelope['agentcred']['jws'][:50]}...")

    # Verify (1 line)
    result = verify(envelope)
    print(f"Verified: {result['verified']}")


if __name__ == "__main__":
    main()
