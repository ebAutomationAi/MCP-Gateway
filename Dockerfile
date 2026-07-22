FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy and install dependencies as root (required for npm ci file permissions)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY index.js .

# Transfer ownership of the app directory to the built-in node user, then switch
# Reason: all files must exist before chown; switching after install avoids
# permission errors during npm ci while still running the process as non-root
RUN chown -R node:node /app
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
