Este archivo contiene todo lo necesario para que, si inicias un chat nuevo (conmigo o con otro modelo), solo tengas que adjuntarlo y decir: "Lee este archivo, este es el estado actual de mi infraestructura de auditoría, ayúdame a seguir desde aquí".


📂 MCP Gateway - Documentación & Memoria del Proyecto
1. README.md: Manual Técnico
🎯 Objetivo del Proyecto
Crear una herramienta de auditoría reutilizable ("Caja de herramientas") aislada del proyecto principal (bookmarks-system). Este gateway permite conectar Minimax Agents (que requieren un endpoint HTTP/SSE público) con el GitHub MCP Server (que funciona localmente por consola), utilizando un contenedor Docker intermediario y un túnel Ngrok.

🏗️ Arquitectura
El sistema se compone de dos servicios orquestados vía Docker Compose:

mcp-github (Node.js): Un adaptador personalizado que envuelve la librería oficial @modelcontextprotocol/server-github. Convierte las peticiones HTTP/SSE de Minimax en comandos internos para leer repositorios de GitHub.

ngrok-mcp: Crea un túnel seguro (HTTPS) desde internet hacia el puerto local 3001 del adaptador.

⚙️ Estructura de Archivos
Ubicación: Carpeta /mcp_gateway (al mismo nivel que el proyecto a auditar, no dentro).

A. docker-compose.yml
YAML
version: '3.8'

services:
  mcp-github:
    build: .
    container_name: mcp-github-audit
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - PORT=3001
    ports:
      - "3001:3001"
    restart: unless-stopped
    networks:
      - audit-net

  ngrok-mcp:
    image: ngrok/ngrok:latest
    container_name: ngrok-mcp-audit
    environment:
      - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
    command: ["http", "mcp-github:3001"]
    ports:
      - "4040:4040"
    networks:
      - audit-net
    depends_on:
      - mcp-github

networks:
  audit-net:
    driver: bridge
B. Dockerfile
Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
EXPOSE 3001
CMD ["node", "index.js"]
C. package.json
Importante: Debe incluir "type": "module".

JSON
{
  "name": "mcp-gateway",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.1",
    "@modelcontextprotocol/server-github": "^0.6.0",
    "express": "^4.21.0"
  }
}
D. index.js (Adaptador SSE)
Solución crítica: Importación directa desde /dist/index.js para evitar errores de ESM.

JavaScript
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// Importación específica para evitar ERR_MODULE_NOT_FOUND
import { GitHubServer } from "@modelcontextprotocol/server-github/dist/index.js"; 

const app = express();
const server = new GitHubServer();

app.get("/sse", async (req, res) => {
  console.log("Minimax conectado vía SSE");
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  await server.connect(new SSEServerTransport("/messages", res));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP Server corriendo en puerto ${PORT}`);
});
E. .env (No versionar)
Fragmento de código
GITHUB_TOKEN=ghp_TU_TOKEN_CLASSIC_CON_PERMISO_REPO
NGROK_AUTHTOKEN=TU_TOKEN_DE_NGROK
🚀 Instrucciones de Uso
Preparación:

Asegurarse de que el proyecto principal (bookmarks-system) esté detenido si se usa Ngrok Free (docker-compose down).

Generar un Token GitHub Classic con scope repo.

Despliegue:

Bash
cd mcp_gateway
docker-compose up -d --build
Obtener URL:

Bash
docker logs ngrok-mcp-audit
# O visitar http://localhost:4040
Copiar la URL tipo https://xxxx.ngrok-free.app.

Configuración en Minimax:

MCP URL: https://xxxx.ngrok-free.app/sse

Variables de Entorno del Agente:

TARGET_OWNER: Dueño del repo (ej: ebAutomationAi).

TARGET_REPO: Nombre del repo (ej: bookmarks-system).

BRANCH: main.

2. Memoria de Evolución del Proyecto (Contexto para LLM)
Esta sección explica las decisiones tomadas y los problemas resueltos para que el asistente de IA entienda el estado actual.

📅 Historial de Decisiones
Estrategia de Auditoría:

Se descartó la auditoría manual.

Se optó por Minimax Agent debido a su gran ventana de contexto.

Se requirió configurar una herramienta MCP (Model Context Protocol) para que el agente lea el código directamente.

Infraestructura:

Problema: Minimax necesita una URL pública. El servidor MCP de GitHub es local (stdio).

Solución 1 (Descartada): Usar servicios como Smithery/Railway (requiere subir credenciales a terceros).

Solución 2 (Adoptada): Self-hosting local con Docker + Ngrok. Esto permite reutilizar la herramienta para futuros proyectos sin exponer tokens.

Conflictos de Red:

El puerto 3000 estaba ocupado por linkwarden (proyecto objetivo).

Acción: Se movió el mcp-gateway al puerto 3001.

Restricción: Ngrok Free solo permite 1 túnel simultáneo. Se estableció el protocolo de apagar el proyecto objetivo antes de levantar la auditoría.

Desafíos Técnicos (Troubleshooting):

Error: La imagen Docker ghcr.io/smithery-ai/mcp-server-github dio error denied.

Fix: Se creó un Dockerfile propio para construir la imagen localmente.

Error: ERR_MODULE_NOT_FOUND al ejecutar Node.js.

Causa: La librería @modelcontextprotocol/server-github tiene problemas con las exportaciones ESM en Node 18.

Fix: Se modificó index.js para importar explícitamente desde dist/index.js y se aseguró "type": "module" en package.json.

🚦 Estado Actual
El contenedor mcp-github-audit debe estar corriendo en puerto 3001.

El código index.js está parcheado para funcionar con la versión actual del SDK de MCP.

El usuario está listo para realizar la auditoría de seguridad sobre bookmarks-system.