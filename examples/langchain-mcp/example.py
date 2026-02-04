"""
AgentCred + LangChain Integration Example

Uses the AgentCred MCP server to give LangChain agents
cryptographic signing capabilities. No Python SDK needed —
just the MCP adapter.

Prerequisites:
  pip install langchain-mcp-adapters langchain-openai langgraph
  export GITHUB_TOKEN=ghp_your_token
  export OPENAI_API_KEY=sk-...
"""
import asyncio
import os

from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent


async def main():
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        print("Missing GITHUB_TOKEN. Set: export GITHUB_TOKEN=ghp_your_token")
        return

    github_username = os.environ.get("GITHUB_USERNAME")
    if not github_username:
        print("Missing GITHUB_USERNAME. Set: export GITHUB_USERNAME=your-github-username")
        return

    if not os.environ.get("OPENAI_API_KEY"):
        print("Missing OPENAI_API_KEY. Set: export OPENAI_API_KEY=sk-...")
        return

    command = os.environ.get("AGENTCRED_MCP_COMMAND", "npx")
    args = os.environ.get("AGENTCRED_MCP_ARGS", "-y @agentcred-ai/mcp-server").split()

    # 1. Connect to AgentCred MCP server
    client = MultiServerMCPClient(
        {
            "agentcred": {
                "command": command,
                "args": args,
                "transport": "stdio",
                "env": {
                    "GITHUB_TOKEN": github_token,
                    "GITHUB_USERNAME": github_username,
                },
            }
        }
    )

    # 2. Get AgentCred tools (init, sign, verify, whoami)
    tools = await client.get_tools()
    print(f"Available tools: {[t.name for t in tools]}")

    init_tool = next(tool for tool in tools if tool.name == "agentcred_init")
    init_result = await init_tool.ainvoke({"github_token": github_token})
    print(f"Init result: {init_result}")

    # 3. Create agent with AgentCred tools
    model = ChatOpenAI(model="gpt-4o")
    agent = create_react_agent(model, tools)

    # 4. Agent can now sign content!
    result = await agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": "Sign this message with AgentCred: "
                    "'Analysis complete: Q4 revenue increased 15%'",
                }
            ]
        }
    )

    # Print the signed result
    for msg in result["messages"]:
        content = msg.content[:200] if msg.content else "(tool call)"
        print(f"[{msg.type}] {content}")


if __name__ == "__main__":
    asyncio.run(main())
