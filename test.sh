#!/bin/bash
# test.sh — Generic smoke test for MCP-Gateway
# Tests health check, SSE connection, and tools/list via JSON-RPC.
# Works with any MCP server configured in MCP_ARGS.

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
API_TOKEN="${API_TOKEN:-}"
TIMEOUT=10

AUTH_HEADER=""
if [ -n "$API_TOKEN" ]; then
  AUTH_HEADER="Authorization: Bearer $API_TOKEN"
fi

echo "🔍 Testing MCP-Gateway at $BASE_URL"
echo ""

# 1. Health check
echo "1/3 Health check..."
HEALTH=$(curl -sf --max-time "$TIMEOUT" "$BASE_URL/health")
echo "    ✅ $HEALTH"
echo ""

# 2. SSE connection — capture sessionId
echo "2/3 SSE connection..."
if [ -n "$AUTH_HEADER" ]; then
  SSE_RESPONSE=$(curl -sf --max-time "$TIMEOUT" -N \
    -H "$AUTH_HEADER" \
    "$BASE_URL/sse" 2>/dev/null | head -n 4 || true)
else
  SSE_RESPONSE=$(curl -sf --max-time "$TIMEOUT" -N \
    "$BASE_URL/sse" 2>/dev/null | head -n 4 || true)
fi

SESSION_ID=$(echo "$SSE_RESPONSE" | grep '"sessionId"' | sed 's/.*"sessionId":"\([^"]*\)".*/\1/')

if [ -z "$SESSION_ID" ]; then
  echo "    ❌ Could not obtain sessionId. Is the gateway running with valid MCP_ARGS?"
  exit 1
fi
echo "    ✅ sessionId: $SESSION_ID"
echo ""

# 3. Send tools/list — response arrives on SSE stream, POST just confirms delivery
echo "3/3 Sending tools/list..."
if [ -n "$AUTH_HEADER" ]; then
  SEND=$(curl -sf --max-time "$TIMEOUT" -X POST "$BASE_URL/messages" \
    -H "$AUTH_HEADER" \
    -H "x-session-id: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}')
else
  SEND=$(curl -sf --max-time "$TIMEOUT" -X POST "$BASE_URL/messages" \
    -H "x-session-id: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}')
fi
echo "    ✅ $SEND"
echo ""

echo "✅ All checks passed."
