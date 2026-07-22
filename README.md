# MCP-Gateway

Generic HTTP/SSE bridge that exposes any stdio-based MCP server over HTTP.
Configure which MCP server to run via environment variables — no code changes required.

[![Tests](https://github.com/ebAutomationAi/MCP-Gateway/actions/workflows/test.yml/badge.svg)](https://github.com/ebAutomationAi/MCP-Gateway/actions/workflows/test.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Architecture

```
HTTP/SSE client
      ↓
Express server (port 3001)
      ↓
spawn(MCP_COMMAND, MCP_ARGS)   ← stdio bridge
      ↓
Any MCP-compatible server (GitHub, Filesystem, …)
```


The gateway does not know or depend on any specific MCP server.
Swap `MCP_COMMAND`/`MCP_ARGS` to point at a different server — nothing else changes.

## Requirements

- Docker and Docker Compose
- Credentials required by the MCP server you want to expose (e.g. a GitHub PAT)

## Quick start

```bash
git clone https://github.com/ebAutomationAi/MCP-Gateway.git
cd MCP-Gateway
cp .env.example .env
# Edit .env: set MCP_COMMAND, MCP_ARGS, API_TOKEN, and any server-specific credentials
docker compose up -d
curl http://localhost:3001/health
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `MCP_COMMAND` | No | `npx` | Executable to launch |
| `MCP_ARGS` | **Yes** | — | Space-separated arguments passed to `MCP_COMMAND` |
| `API_TOKEN` | No | — | Bearer token for auth. If unset, auth is disabled (dev only) |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3001` | Comma-separated list of allowed origins |
| `PORT` | No | `3001` | Port the gateway listens on |

Any additional variable defined in `.env` is automatically forwarded to the MCP child process via `...process.env`.

### Example — GitHub MCP server

```env
MCP_COMMAND=npx
MCP_ARGS=-y @modelcontextprotocol/server-github
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx
API_TOKEN=your_secure_token   # openssl rand -hex 32
```

### Example — Filesystem MCP server

```env
MCP_COMMAND=npx
MCP_ARGS=-y @modelcontextprotocol/server-filesystem /data
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Service status and active session count |
| `GET` | `/sse` | Yes | Open an SSE stream and start an MCP process |
| `POST` | `/messages` | Yes | Send a JSON-RPC message to an active session |
| `GET` | `/sessions` | Yes | List active sessions |
| `DELETE` | `/sessions/:id` | Yes | Terminate a session |

All authenticated endpoints require `Authorization: Bearer <API_TOKEN>`.
If `API_TOKEN` is not set, authentication is skipped.

## Usage

### 1. Open an SSE connection

```bash
curl -N -H "Authorization: Bearer $API_TOKEN" http://localhost:3001/sse
# First event returns the session ID:
# event: session
# data: {"sessionId":"session-1234567890-abc123def"}
```

### 2. Send a JSON-RPC message

```bash
curl -X POST http://localhost:3001/messages \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "x-session-id: session-1234567890-abc123def" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
# {"status":"sent","sessionId":"session-1234567890-abc123def"}
# The MCP response arrives on the SSE stream.
```

### Python client example

```python
import requests, json, sseclient  # pip install sseclient-py

BASE = "http://localhost:3001"
TOKEN = "your_api_token"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

r = requests.get(f"{BASE}/sse", headers=HEADERS, stream=True)
client = sseclient.SSEClient(r)

session_id = None
for event in client.events():
    if event.event == "session":
        session_id = json.loads(event.data)["sessionId"]
        break

requests.post(
    f"{BASE}/messages",
    headers={**HEADERS, "x-session-id": session_id, "Content-Type": "application/json"},
    json={"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 1}
)

for event in client.events():
    print(json.loads(event.data))
```

## Development

```bash
npm install
npm run dev          # node --watch index.js
npm test             # Jest + supertest
npm run test:coverage
```

### Run with ngrok (public exposure)

```bash
# Requires NGROK_AUTHTOKEN in .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# Inspect tunnel URL at http://localhost:4040
```

## Security

- Set `API_TOKEN` in production. Generate with `openssl rand -hex 32`.
- Set `CORS_ORIGINS` to the exact origins your client runs on.
- The container runs as the built-in `node` user (uid 1000), not root.
- Use ngrok only for development and testing — never as production infrastructure.

## Key design decisions

**`MCP_COMMAND`/`MCP_ARGS` pattern** — The gateway launches the MCP process via `spawn()` using only environment variables. This keeps the gateway server-agnostic: switching from the GitHub server to the Filesystem server (or any other stdio-compatible MCP server) requires no code change and no image rebuild.

**No MCP SDK dependency** — The gateway communicates with the MCP process over stdio using newline-delimited JSON, which is all the MCP stdio transport requires. The `@modelcontextprotocol/sdk` package adds no value here and was removed.

**ngrok in a separate Compose file** — `docker-compose.yml` is safe to run in any environment. Ngrok, which opens a public internet tunnel, is opt-in via `docker-compose.dev.yml`.

**Non-root container** — The Dockerfile installs dependencies as root, transfers ownership with `chown -R node:node /app`, then switches to the built-in `node` user before `CMD`. This avoids `npm ci` permission errors while still running the process as non-root.

## Troubleshooting

**Container does not start**
```bash
docker compose logs mcp-github
docker compose down && docker compose up -d --build
```

**`MCP_ARGS not set` error**
`MCP_ARGS` is required. Set it in `.env` before starting.

**Port 3001 already in use**
Set `PORT=3002` in `.env` and update the port mapping in `docker-compose.yml`.

**Ngrok tunnel not connecting**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs ngrok-mcp
```

## CI

Tests run on Node.js 18, 20, and 22 on every push and pull request to `main`.

## License

MIT
