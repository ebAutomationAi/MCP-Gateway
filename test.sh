#!/bin/bash

# Script de testing para MCP GitHub HTTP Bridge
# Uso: ./test.sh

set -e

echo "🧪 Testing MCP GitHub HTTP Bridge"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

# Test 1: Health Check
echo "📊 Test 1: Health Check"
HEALTH_RESPONSE=$(curl -s ${BASE_URL}/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Sessions endpoint
echo "📋 Test 2: Sessions List"
SESSIONS_RESPONSE=$(curl -s ${BASE_URL}/sessions)
echo -e "${GREEN}✅ Sessions endpoint accessible${NC}"
echo "   Response: $SESSIONS_RESPONSE"
echo ""

# Test 3: SSE Connection (background)
echo "🔌 Test 3: SSE Connection"
echo -e "${YELLOW}⏳ Iniciando conexión SSE en background...${NC}"

# Iniciar SSE en background y guardar output
SSE_OUTPUT=$(mktemp)
curl -s -N ${BASE_URL}/sse > "$SSE_OUTPUT" 2>&1 &
SSE_PID=$!

# Esperar un poco para que se establezca la conexión
sleep 3

# Verificar que el proceso sigue corriendo
if ps -p $SSE_PID > /dev/null; then
    echo -e "${GREEN}✅ Conexión SSE establecida (PID: $SSE_PID)${NC}"
    
    # Intentar extraer el session ID
    sleep 2
    if [ -f "$SSE_OUTPUT" ]; then
        echo "   Primeros datos recibidos:"
        head -n 5 "$SSE_OUTPUT" | sed 's/^/   /'
    fi
else
    echo -e "${RED}❌ Conexión SSE falló${NC}"
    rm -f "$SSE_OUTPUT"
    exit 1
fi
echo ""

# Test 4: Verificar sesiones activas
echo "🔍 Test 4: Verificar Sesiones Activas"
sleep 2
ACTIVE_SESSIONS=$(curl -s ${BASE_URL}/sessions)
SESSION_COUNT=$(echo "$ACTIVE_SESSIONS" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')

if [ "$SESSION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Hay $SESSION_COUNT sesión(es) activa(s)${NC}"
    echo "   Detalles: $ACTIVE_SESSIONS"
else
    echo -e "${RED}❌ No hay sesiones activas${NC}"
fi
echo ""

# Cleanup
echo "🧹 Limpiando..."
kill $SSE_PID 2>/dev/null || true
rm -f "$SSE_OUTPUT"

echo ""
echo "=================================="
echo -e "${GREEN}✅ Todos los tests completados${NC}"
echo ""
echo "💡 Para testing interactivo:"
echo "   1. Abre http://localhost:4040 para ver el túnel Ngrok"
echo "   2. Usa 'curl -N http://localhost:3001/sse' para conectar por SSE"
echo "   3. Revisa los logs: docker-compose logs -f mcp-github"