# 📚 Ejemplos de Uso - MCP GitHub HTTP Bridge

## Ejemplo 1: Buscar Repositorios Populares

### Request:
```bash
# 1. Conectar y obtener sessionId
curl -N http://localhost:3001/sse &

# 2. Buscar repos (reemplaza SESSION_ID)
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_repositories",
      "arguments": {
        "query": "language:python stars:>5000 topics:machine-learning"
      }
    },
    "id": 1
  }'
```

### Respuesta (vía SSE):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "repositories": [
      {
        "name": "tensorflow",
        "full_name": "tensorflow/tensorflow",
        "description": "An Open Source Machine Learning Framework",
        "stars": 185000,
        "url": "https://github.com/tensorflow/tensorflow"
      }
    ]
  },
  "id": 1
}
```

---

## Ejemplo 2: Leer Contenido de un Archivo

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
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
    "id": 2
  }'
```

### Respuesta:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": "# Hello World\n\nThis is a simple README file...",
    "encoding": "utf-8",
    "size": 1234,
    "sha": "abc123def456"
  },
  "id": 2
}
```

---

## Ejemplo 3: Crear un Issue

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_issue",
      "arguments": {
        "owner": "tu-usuario",
        "repo": "tu-repo",
        "title": "Bug encontrado en la funcionalidad X",
        "body": "## Descripción\n\nEncontré un bug cuando...\n\n## Pasos para reproducir\n1. Paso 1\n2. Paso 2\n\n## Comportamiento esperado\nDebería hacer X\n\n## Comportamiento actual\nHace Y"
      }
    },
    "id": 3
  }'
```

### Respuesta:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "number": 42,
    "title": "Bug encontrado en la funcionalidad X",
    "url": "https://github.com/tu-usuario/tu-repo/issues/42",
    "state": "open"
  },
  "id": 3
}
```

---

## Ejemplo 4: Crear un Pull Request

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_pull_request",
      "arguments": {
        "owner": "tu-usuario",
        "repo": "tu-repo",
        "title": "Añadir nueva funcionalidad",
        "body": "Esta PR añade...",
        "head": "feature-branch",
        "base": "main"
      }
    },
    "id": 4
  }'
```

---

## Ejemplo 5: Crear o Actualizar Archivo

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_or_update_file",
      "arguments": {
        "owner": "tu-usuario",
        "repo": "tu-repo",
        "path": "docs/API.md",
        "content": "# Documentación de API\n\n## Endpoints\n...",
        "message": "Actualizar documentación de API",
        "branch": "main"
      }
    },
    "id": 5
  }'
```

---

## Ejemplo 6: Fork de un Repositorio

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "fork_repository",
      "arguments": {
        "owner": "nodejs",
        "repo": "node"
      }
    },
    "id": 6
  }'
```

---

## Ejemplo 7: Crear una Rama

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_branch",
      "arguments": {
        "owner": "tu-usuario",
        "repo": "tu-repo",
        "branch": "feature/nueva-funcionalidad",
        "from_branch": "main"
      }
    },
    "id": 7
  }'
```

---

## Ejemplo 8: Listar Herramientas Disponibles

### Request:
```bash
curl -X POST http://localhost:3001/messages \
  -H "x-session-id: SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 8
  }'
```

### Respuesta:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "create_or_update_file",
        "description": "Create or update a single file in a GitHub repository",
        "inputSchema": {...}
      },
      {
        "name": "search_repositories",
        "description": "Search for GitHub repositories",
        "inputSchema": {...}
      },
      ...
    ]
  },
  "id": 8
}
```

---

## Ejemplo 9: Workflow Completo - Crear Feature

```bash
#!/bin/bash

SESSION_ID="tu-session-id"
BASE_URL="http://localhost:3001"
OWNER="tu-usuario"
REPO="tu-repo"

# Función helper para enviar comandos
send_command() {
    local method=$1
    local name=$2
    local args=$3
    local id=$4
    
    curl -s -X POST ${BASE_URL}/messages \
        -H "x-session-id: ${SESSION_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"${method}\",
            \"params\": {
                \"name\": \"${name}\",
                \"arguments\": ${args}
            },
            \"id\": ${id}
        }"
}

echo "🚀 Creando nueva feature completa..."

# 1. Crear rama
echo "📌 Paso 1: Crear rama feature/auth"
send_command "tools/call" "create_branch" '{
    "owner": "'${OWNER}'",
    "repo": "'${REPO}'",
    "branch": "feature/auth",
    "from_branch": "main"
}' 1

sleep 2

# 2. Añadir archivo
echo "📝 Paso 2: Crear archivo de autenticación"
send_command "tools/call" "create_or_update_file" '{
    "owner": "'${OWNER}'",
    "repo": "'${REPO}'",
    "path": "src/auth.js",
    "content": "export function authenticate(user, password) {\n  // TODO: implementar\n}",
    "message": "Add authentication module",
    "branch": "feature/auth"
}' 2

sleep 2

# 3. Crear Pull Request
echo "🔀 Paso 3: Crear Pull Request"
send_command "tools/call" "create_pull_request" '{
    "owner": "'${OWNER}'",
    "repo": "'${REPO}'",
    "title": "Add authentication feature",
    "body": "## Changes\n- Added auth module\n- Implemented basic auth logic",
    "head": "feature/auth",
    "base": "main"
}' 3

echo "✅ Feature creada!"
```

---

## Ejemplo 10: Cliente JavaScript Completo

```javascript
// client.js
import MCPGitHubClient from './client-example.js';

async function ejemplo() {
  const client = new MCPGitHubClient('http://localhost:3001');
  
  // Conectar
  await client.connect();
  
  // Esperar que el servidor MCP esté listo
  await new Promise(r => setTimeout(r, 2000));
  
  // Buscar repos
  console.log('🔍 Buscando repositorios...');
  await client.searchRepositories('language:rust stars:>1000');
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Obtener un archivo
  console.log('📄 Obteniendo README...');
  await client.getFileContents('rust-lang', 'rust', 'README.md');
  
  // Mantener vivo
  await new Promise(() => {});
}

ejemplo();
```

---

## Ejemplo 11: Integración con Python

```python
#!/usr/bin/env python3
import requests
import json
import sseclient  # pip install sseclient-py

class MCPGitHubClient:
    def __init__(self, base_url='http://localhost:3001'):
        self.base_url = base_url
        self.session_id = None
        self.message_id = 1
        
    def connect(self):
        """Conectar vía SSE y obtener session ID"""
        response = requests.get(f'{self.base_url}/sse', stream=True)
        client = sseclient.SSEClient(response)
        
        for event in client.events():
            if event.event == 'session':
                data = json.loads(event.data)
                self.session_id = data['sessionId']
                print(f'✅ Conectado! Session: {self.session_id}')
                break
                
        return client
    
    def send_command(self, method, params):
        """Enviar comando al servidor MCP"""
        message = {
            'jsonrpc': '2.0',
            'method': method,
            'params': params,
            'id': self.message_id
        }
        self.message_id += 1
        
        response = requests.post(
            f'{self.base_url}/messages',
            headers={
                'Content-Type': 'application/json',
                'x-session-id': self.session_id
            },
            json=message
        )
        
        return response.json()

# Uso
client = MCPGitHubClient()
sse = client.connect()

# Buscar repos
client.send_command('tools/call', {
    'name': 'search_repositories',
    'arguments': {
        'query': 'language:python stars:>10000'
    }
})

# Escuchar respuestas
for event in sse.events():
    print(f'📨 {event.data}')
```

---

## Tips y Mejores Prácticas

### 1. Manejo de Errores
```bash
# Siempre verifica el código de respuesta HTTP
response=$(curl -s -w "\n%{http_code}" -X POST ...)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" != "200" ]; then
    echo "Error: $http_code"
    echo "$body"
    exit 1
fi
```

### 2. Timeout en Conexiones SSE
```bash
# Usa timeout para evitar conexiones colgadas
timeout 30 curl -N http://localhost:3001/sse
```

### 3. Logging de Mensajes
```bash
# Guarda todos los mensajes SSE en un archivo
curl -N http://localhost:3001/sse | tee sse-log.txt
```

### 4. Rate Limiting
GitHub tiene límites de API. Verifica tus límites:
```bash
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/rate_limit
```

---

## Recursos Adicionales

- [Documentación MCP GitHub](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [API de GitHub](https://docs.github.com/en/rest)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
