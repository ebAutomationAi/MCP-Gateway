// Cliente de ejemplo para MCP GitHub HTTP Bridge
// Uso: node client-example.js

class MCPGitHubClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.messageId = 1;
  }

  // Conectar vía SSE
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Conectando al servidor MCP...');
      
      const eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      eventSource.addEventListener('session', (event) => {
        const data = JSON.parse(event.data);
        this.sessionId = data.sessionId;
        console.log(`✅ Conectado! Session ID: ${this.sessionId}`);
        resolve(eventSource);
      });

      eventSource.addEventListener('message', (event) => {
        console.log('📨 Mensaje recibido:', event.data);
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.log('📝 Log del servidor:', event.data);
        }
      });

      eventSource.onerror = (error) => {
        console.error('❌ Error en conexión SSE:', error);
        reject(error);
      };

      // Timeout de 10 segundos
      setTimeout(() => {
        if (!this.sessionId) {
          eventSource.close();
          reject(new Error('Timeout conectando al servidor'));
        }
      }, 10000);
    });
  }

  // Manejar mensajes del servidor
  handleMessage(data) {
    if (data.result) {
      console.log('✅ Resultado:', JSON.stringify(data.result, null, 2));
    } else if (data.error) {
      console.error('❌ Error:', data.error);
    }
  }

  // Enviar un comando
  async sendCommand(method, params) {
    if (!this.sessionId) {
      throw new Error('No hay sesión activa. Llama a connect() primero.');
    }

    const message = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: this.messageId++
    };

    console.log('📤 Enviando comando:', method);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': this.sessionId
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log('✅ Comando enviado:', result);
    return result;
  }

  // Método helper: Buscar repositorios
  async searchRepositories(query) {
    return this.sendCommand('tools/call', {
      name: 'search_repositories',
      arguments: { query }
    });
  }

  // Método helper: Obtener contenido de archivo
  async getFileContents(owner, repo, path) {
    return this.sendCommand('tools/call', {
      name: 'get_file_contents',
      arguments: { owner, repo, path }
    });
  }

  // Método helper: Crear issue
  async createIssue(owner, repo, title, body) {
    return this.sendCommand('tools/call', {
      name: 'create_issue',
      arguments: { owner, repo, title, body }
    });
  }

  // Método helper: Listar herramientas disponibles
  async listTools() {
    return this.sendCommand('tools/list', {});
  }
}

// Ejemplo de uso
async function main() {
  const client = new MCPGitHubClient();

  try {
    // Conectar
    const eventSource = await client.connect();

    // Esperar un poco para que el servidor MCP esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Listar herramientas disponibles
    console.log('\n📋 Listando herramientas disponibles...');
    await client.listTools();

    // Esperar respuesta
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Buscar repos populares de JavaScript
    console.log('\n🔍 Buscando repositorios de JavaScript...');
    await client.searchRepositories('language:javascript stars:>10000');

    // Mantener la conexión abierta para recibir respuestas
    console.log('\n⏳ Esperando respuestas... (Ctrl+C para salir)');

    // Mantener el proceso vivo
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si es el archivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MCPGitHubClient;