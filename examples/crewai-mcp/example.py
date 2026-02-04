"""
AgentCred + CrewAI Integration Example

Uses the AgentCred MCP server to give CrewAI agents
cryptographic signing capabilities via MCP adapter.

Prerequisites:
  pip install crewai crewai-tools
  export GITHUB_TOKEN=ghp_your_token
  export OPENAI_API_KEY=sk-...
"""
import os

from crewai_tools import MCPServerAdapter
from mcp import StdioServerParameters


def main():
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        print("Missing GITHUB_TOKEN. Set: export GITHUB_TOKEN=ghp_your_token")
        return

    github_username = os.environ.get("GITHUB_USERNAME")
    if not github_username:
        print("Missing GITHUB_USERNAME. Set: export GITHUB_USERNAME=your-github-username")
        return

    command = os.environ.get("AGENTCRED_MCP_COMMAND", "npx")
    args = os.environ.get("AGENTCRED_MCP_ARGS", "-y @agentcred-ai/mcp-server").split()

    # 1. Connect to AgentCred MCP server
    server_params = StdioServerParameters(
        command=command,
        args=args,
        env={
            "GITHUB_TOKEN": github_token,
            "GITHUB_USERNAME": github_username,
        },
    )

    with MCPServerAdapter(
        server_params,
        "agentcred_sign",
        "agentcred_verify",
        "agentcred_whoami",
    ) as tools:
        print(f"Available tools: {[t.name for t in tools]}")

        # 2. Call the MCP tool directly
        sign_tool = next(tool for tool in tools if tool.name == "agentcred_sign")
        result = sign_tool.run(content="Q4 revenue increased by 15% year-over-year")
        print(f"\nResult: {result}")


if __name__ == "__main__":
    main()
