FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache git

WORKDIR /app

# Copiar package.json y package-lock.json si existe
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm install

# Instalar el servidor MCP GitHub globalmente
RUN npm install -g @modelcontextprotocol/server-github

# Copiar el código del wrapper
COPY index.js .

# Exponer el puerto
EXPOSE 3001

# Healthcheck para verificar que el servicio está funcionando
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Ejecutar el wrapper HTTP
CMD ["node", "index.js"]