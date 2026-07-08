# MCP-Gateway — Generic HTTP/SSE Bridge for MCP Servers

Wrapper HTTP/SSE genérico para servidores MCP (Model Context Protocol), que permite acceso vía HTTP a las capacidades de cualquier servidor MCP compatible con stdio — no solo GitHub.

## 🏗️ Arquitectura

```
Cliente HTTP/SSE
    ↓
Express Server (puerto 3001)
    ↓
Proceso MCP (stdio) — spawn(MCP_COMMAND, MCP_ARGS)
    ↓
Servidor MCP objetivo (GitHub, Filesystem, etc.)
```

El proceso MCP concreto que se lanza depende únicamente de las variables de entorno `MCP_COMMAND` y `MCP_ARGS` — el gateway no conoce ni depende de ningún servidor MCP en particular.

## 📋 Requisitos

- Docker y Docker Compose
- Las credenciales que requiera el servidor MCP que quieras usar (p. ej. un token de GitHub, una ruta de filesystem, etc.)
- Token de Ngrok (para exposición pública)

## 🚀 Instalación

1. **Clonar o copiar los archivos:**
   ```bash
   # Asegúrate de tener estos archivos:
   # - index.js
   # - Dockerfile
   # - docker-compose.yml
   # - package.json
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env y define MCP_COMMAND / MCP_ARGS y demás credenciales
   ```

3. **Construir y ejecutar:**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Verificar que está funcionando:**
   ```bash
   docker logs mcp-github-audit
   curl http://localhost:3001/health
   ```

## ⚙️ Configuración

El servidor MCP a ejecutar se configura con dos variables de entorno:

- `MCP_COMMAND`: el ejecutable a lanzar (por defecto `npx`).
- `MCP_ARGS`: los argumentos, separados por espacios, que se pasan a ese ejecutable.

Cualquier otra variable de entorno necesaria para el servidor MCP elegido (tokens, rutas, etc.) se define también en `.env` y se propaga automáticamente al proceso hijo vía `...process.env`.

### Ejemplo — GitHub MCP server

```env
MCP_COMMAND=npx
MCP_ARGS=-y @modelcontextprotocol/server-github
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_pat_here
```

### Ejemplo — Filesystem MCP server

```env
MCP_COMMAND=npx
MCP_ARGS=-y @modelcontextprotocol/server-filesystem /path/to/dir
```

Para usar cualquier otro servidor MCP compatible con stdio, basta con cambiar `MCP_COMMAND`/`MCP_ARGS` (y las credenciales que ese servidor necesite) — no hace falta tocar el código del gateway.

## ❓ Why generic?

El diseño anterior dependía de forma rígida de `@modelcontextprotocol/server-github`, un paquete concreto que puede quedar deprecado, dejar de recibir parches de seguridad o simplemente no ser el servidor que necesitas. Con `MCP_COMMAND`/`MCP_ARGS` el gateway se limita a hacer de puente HTTP/SSE ↔ stdio: puedes intercambiar el servidor MCP subyacente (GitHub, Filesystem, o cualquier otro) sin tocar `index.js`, sin reconstruir la imagen con un paquete distinto instalado globalmente y sin arrastrar dependencias de servidores MCP concretos en `package.json`.

## 🔌 Endpoints

### `GET /health`
Health check del servidor.

**Respuesta:**
```json
{
  "status": "ok",
  "activeSessions": 0,
  "uptime": 123.45
}
```

### `GET /sse`
Establece una conexión SSE y crea una sesión MCP, lanzando el proceso configurado en `MCP_COMMAND`/`MCP_ARGS`.

**Respuesta:**
- Header: `Content-Type: text/event-stream`
- Primer evento: `{ "sessionId": "session-xxx" }`
- Eventos subsecuentes: mensajes del servidor MCP

**Ejemplo con curl:**
```bash
curl -N http://localhost:3001/sse
```

### `POST /messages`
Envía un mensaje al servidor MCP de una sesión activa.

**Headers requeridos:**
- `x-session-id`: ID de sesión obtenido de `/sse`
- `Content-Type: application/json`

**Body:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_file_contents",
    "arguments": {
      "owner": "octocat",
      "repo": "Hello-World",
      "path": "README.md"
    }
  },
  "id": 1
}
```

**Respuesta:**
```json
{
  "status": "sent",
  "sessionId": "session-xxx"
}
```

### `GET /sessions`
Lista todas las sesiones activas (útil para debugging).

**Respuesta:**
```json
{
  "count": 2,
  "sessions": [
    {
      "sessionId": "session-xxx",
      "pid": 123,
      "createdAt": "2026-01-27T18:00:00.000Z",
      "alive": true
    }
  ]
}
```

### `DELETE /sessions/:sessionId`
Cierra una sesión específica.

**Respuesta:**
```json
{
  "status": "deleted",
  "sessionId": "session-xxx"
}
```

## 📡 Acceso Público con Ngrok

Ngrok expone automáticamente el servidor al internet:

1. **Ver la URL pública:**
   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. **O accede a la interfaz web:**
   ```
   http://localhost:4040
   ```

La URL pública tendrá el formato: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

## 🧪 Ejemplo de Uso Completo

```bash
# 1. Establecer conexión SSE
curl -N http://localhost:3001/sse &
# Captura el sessionId del primer evento

# 2. Enviar un mensaje al servidor MCP configurado
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: session-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_repositories",
      "arguments": {
        "query": "language:javascript stars:>1000"
      }
    },
    "id": 1
  }'

# 3. La respuesta llegará por el stream SSE
```

## 🐛 Debugging

### Ver logs en tiempo real:
```bash
docker-compose logs -f mcp-github
```

### Ver sesiones activas:
```bash
curl http://localhost:3001/sessions
```

### Reiniciar el servicio:
```bash
docker-compose restart mcp-github
```

### Reconstruir desde cero:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🛠️ Herramientas MCP Disponibles

Las herramientas disponibles dependen del servidor MCP configurado en `MCP_ARGS`. Por ejemplo, el servidor MCP de GitHub expone herramientas como:

- `create_or_update_file` - Crear o actualizar archivos
- `search_repositories` - Buscar repositorios
- `create_repository` - Crear nuevo repositorio
- `get_file_contents` - Obtener contenido de archivos
- `push_files` - Subir múltiples archivos
- `create_issue` - Crear issues
- `create_pull_request` - Crear pull requests
- `fork_repository` - Hacer fork de repos
- `create_branch` - Crear ramas

Mientras que el servidor MCP de Filesystem expone herramientas para leer/escribir archivos locales dentro del directorio configurado.

Para más detalles sobre cada servidor, consulta: https://github.com/modelcontextprotocol/servers

## 📊 Monitoreo

### Health check automático:
Docker Compose incluye health checks cada 30 segundos.

### Logs estructurados:
El servidor incluye emojis y prefijos para facilitar el debugging:
- 🔌 Conexiones
- 📨 Mensajes recibidos
- 📤 Mensajes enviados
- ⚠️ Advertencias
- ❌ Errores
- 🗑️ Limpiezas

## 🔒 Seguridad

- **No expongas** tus tokens/credenciales del servidor MCP en logs o código
- Usa Ngrok solo para desarrollo/testing
- Define `API_TOKEN` en producción para activar la autenticación de los endpoints (ver abajo)
- Limita las sesiones simultáneas si es necesario

### Autenticación

Los endpoints `/sse`, `/messages`, `/sessions` y `DELETE /sessions/:sessionId` requieren un Bearer token en el header `Authorization`:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" http://localhost:3001/messages
```

Genera un token seguro:
```bash
openssl rand -hex 32
```

Nota: Si `API_TOKEN` no está definida en `.env`, la autenticación está deshabilitada (modo desarrollo).

### CORS

Los endpoints están protegidos contra orígenes no autorizados. Orígenes permitidos:
- `http://localhost:3001` (desarrollo local)
- `http://localhost:3000` (frontend local alternativo)
- `https://ebautomationai.github.io` (GitHub Pages)

Cualquier otro origen recibirá un error CORS. Para agregar más orígenes en desarrollo, modifica `corsOptions.allowedOrigins` en `index.js`.

### Pruebas

Ejecutar tests:
```bash
npm test           # Una vez
npm run test:watch # En modo vigilancia
npm run test:coverage # Con reporte de cobertura
```

Tests cubren:
- Autenticación: tokens válidos, faltantes e inválidos
- CORS: orígenes permitidos y bloqueados

### CI/CD

Cada push a `main` o pull request ejecuta automáticamente:
- Tests en Node.js 18.x, 20.x, 22.x (GitHub Actions)
- Reporte de cobertura
- Verificación de sintaxis

Ver estado en: https://github.com/ebAutomationAi/MCP-Gateway/actions

## 🤝 Contribuir

Si encuentras bugs o mejoras, crea un issue o pull request.

## 📄 Licencia

MIT
