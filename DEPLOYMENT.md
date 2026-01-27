# 🚀 Guía de Despliegue - MCP GitHub HTTP Bridge

## Paso 1: Preparar el entorno

### 1.1 Verificar requisitos
```bash
# Verificar Docker
docker --version
# Debe mostrar: Docker version 20.x.x o superior

# Verificar Docker Compose
docker-compose --version
# Debe mostrar: docker-compose version 1.29.x o superior
```

### 1.2 Crear directorio del proyecto
```bash
mkdir mcp-github-bridge
cd mcp-github-bridge
```

## Paso 2: Copiar archivos

Copia estos archivos al directorio:
- ✅ `index.js` - Servidor principal
- ✅ `Dockerfile` - Configuración de Docker
- ✅ `docker-compose.yml` - Orquestación de servicios
- ✅ `package.json` - Dependencias de Node.js
- ✅ `.dockerignore` - Archivos a ignorar en build
- ✅ `.env.example` - Plantilla de variables de entorno

## Paso 3: Configurar tokens

### 3.1 Obtener GitHub Personal Access Token

1. Ve a: https://github.com/settings/tokens
2. Click en "Generate new token" → "Generate new token (classic)"
3. Dale un nombre descriptivo: `MCP Server Token`
4. Selecciona los siguientes scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
   - ✅ `read:user` (Read user profile data)
5. Click en "Generate token"
6. **¡COPIA EL TOKEN INMEDIATAMENTE!** (no podrás verlo después)

### 3.2 Obtener Ngrok Auth Token

1. Ve a: https://dashboard.ngrok.com/signup (crea cuenta si no tienes)
2. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copia tu authtoken

### 3.3 Crear archivo .env

```bash
cp .env.example .env
nano .env  # o usa tu editor favorito
```

Edita el archivo `.env`:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NGROK_AUTHTOKEN=2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` a git!

## Paso 4: Construir y ejecutar

### 4.1 Build de la imagen Docker
```bash
docker-compose build --no-cache
```

Deberías ver:
```
[+] Building 45.2s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 789B
 ...
 => => naming to docker.io/library/mcp-github-bridge_mcp-github
```

### 4.2 Iniciar los servicios
```bash
docker-compose up -d
```

Deberías ver:
```
[+] Running 3/3
 ✔ Network mcp-github-bridge_audit-net  Created
 ✔ Container mcp-github-audit           Started
 ✔ Container ngrok-mcp-audit            Started
```

### 4.3 Verificar que están corriendo
```bash
docker-compose ps
```

Deberías ver:
```
NAME                  STATUS          PORTS
mcp-github-audit      Up 10 seconds   0.0.0.0:3001->3001/tcp
ngrok-mcp-audit       Up 8 seconds    0.0.0.0:4040->4040/tcp
```

## Paso 5: Verificar funcionamiento

### 5.1 Health check
```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{"status":"ok","activeSessions":0,"uptime":12.345}
```

### 5.2 Ver logs
```bash
docker-compose logs -f mcp-github
```

Deberías ver:
```
mcp-github-audit  | 🚀 MCP HTTP Bridge corriendo en puerto 3001
mcp-github-audit  | 📊 Health check: http://localhost:3001/health
mcp-github-audit  | 🔌 SSE endpoint: http://localhost:3001/sse
mcp-github-audit  | 📨 Messages endpoint: POST http://localhost:3001/messages
```

### 5.3 Obtener URL pública de Ngrok
```bash
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
```

O abre en el navegador: http://localhost:4040

Deberías ver algo como:
```
"https://a1b2-123-45-67-89.ngrok-free.app"
```

## Paso 6: Probar el servidor

### 6.1 Test básico con curl
```bash
# Conectar por SSE (en una terminal)
curl -N http://localhost:3001/sse
```

Deberías recibir:
```
event: session
data: {"sessionId":"session-1234567890-abc123"}

data: ...
```

### 6.2 Ejecutar el script de testing
```bash
chmod +x test.sh
./test.sh
```

### 6.3 Test con el cliente de ejemplo
```bash
node client-example.js
```

## Paso 7: Usar desde Claude

### 7.1 Obtener la URL pública
```bash
# En tu servidor
curl http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### 7.2 Configurar en Claude
1. Copia la URL pública (ej: `https://xxxx.ngrok-free.app`)
2. En Claude, di: "Conéctate a mi servidor MCP en [URL]/sse"
3. Claude debería conectarse y poder usar las herramientas de GitHub

## 🔧 Troubleshooting

### El contenedor no arranca
```bash
# Ver logs detallados
docker-compose logs mcp-github

# Reiniciar desde cero
docker-compose down
docker-compose up -d --build
```

### Error: "GitHub token not configured"
Verifica que el `.env` tenga el token correcto:
```bash
cat .env | grep GITHUB_TOKEN
```

### Ngrok no conecta
Verifica el authtoken:
```bash
docker-compose logs ngrok-mcp
```

### Puerto 3001 ya está en uso
Cambia el puerto en `.env`:
```env
PORT=3002
```

Y en `docker-compose.yml`:
```yaml
ports:
  - "3002:3002"
```

## 🛑 Detener servicios

```bash
# Detener sin borrar
docker-compose stop

# Detener y borrar contenedores
docker-compose down

# Detener, borrar contenedores y limpiar volúmenes
docker-compose down -v
```

## 📊 Monitoreo continuo

### Ver logs en tiempo real
```bash
docker-compose logs -f
```

### Ver solo logs del servidor MCP
```bash
docker-compose logs -f mcp-github
```

### Ver estadísticas de recursos
```bash
docker stats mcp-github-audit
```

## 🎉 ¡Listo!

Tu servidor MCP GitHub HTTP Bridge está corriendo y listo para usar.

Próximos pasos:
- Prueba las diferentes herramientas de GitHub
- Integra con Claude u otros clientes MCP
- Monitorea los logs para debugging
- Configura un dominio personalizado en Ngrok (plan de pago)

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica el health check: `curl http://localhost:3001/health`
3. Prueba el script de testing: `./test.sh`
4. Revisa la documentación en README.md