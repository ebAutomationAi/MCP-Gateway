import express from "express";
import { spawn } from "child_process";

const app = express();

app.use(express.json());

// Mapa de sesiones activas
const sessions = new Map();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

// Endpoint SSE para establecer conexión con MCP
app.get("/sse", async (req, res) => {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔌 Nueva conexión SSE: ${sessionId}`);

  // Configurar headers SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Enviar el session ID al cliente
  res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  // Spawn del proceso MCP GitHub
  const mcpProcess = spawn("npx", ["@modelcontextprotocol/server-github"], {
    env: {
      ...process.env,
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  console.log(`✅ Proceso MCP iniciado para sesión ${sessionId} (PID: ${mcpProcess.pid})`);

  // Guardar sesión
  sessions.set(sessionId, { 
    process: mcpProcess, 
    res,
    createdAt: new Date()
  });

  // Buffer para acumular datos JSON incompletos
  let stdoutBuffer = "";
  let stderrBuffer = "";

  // Manejar salida estándar (mensajes MCP)
  mcpProcess.stdout.on("data", (data) => {
    stdoutBuffer += data.toString();
    
    // Intentar parsear líneas completas
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || ""; // Guardar la última línea incompleta
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          // Validar que sea JSON válido
          JSON.parse(line);
          res.write(`data: ${line}\n\n`);
          console.log(`📤 [${sessionId}] Enviado: ${line.substring(0, 100)}...`);
        } catch (e) {
          // Si no es JSON válido, podría ser un mensaje de log
          console.log(`📝 [${sessionId}] Log: ${line}`);
        }
      }
    });
  });

  // Manejar errores
  mcpProcess.stderr.on("data", (data) => {
    const errorMsg = data.toString();
    console.error(`⚠️ [${sessionId}] Error en MCP: ${errorMsg}`);
    stderrBuffer += errorMsg;
  });

  // Manejar cierre del proceso
  mcpProcess.on("close", (code) => {
    console.log(`🔴 [${sessionId}] Proceso MCP cerrado (código ${code})`);
    if (stderrBuffer) {
      console.error(`🔴 [${sessionId}] Errores acumulados:\n${stderrBuffer}`);
    }
    sessions.delete(sessionId);
    if (!res.headersSent) {
      res.end();
    }
  });

  mcpProcess.on("error", (error) => {
    console.error(`❌ [${sessionId}] Error al iniciar proceso MCP:`, error);
    sessions.delete(sessionId);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to start MCP process" });
    }
  });

  // Cleanup al cerrar conexión del cliente
  req.on("close", () => {
    console.log(`🔌 [${sessionId}] Conexión cerrada por el cliente`);
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill();
    }
    sessions.delete(sessionId);
  });
});

// Endpoint POST para enviar mensajes al servidor MCP
app.post("/messages", async (req, res) => {
  const sessionId = req.headers["x-session-id"];
  
  if (!sessionId) {
    return res.status(400).json({ 
      error: "Missing x-session-id header" 
    });
  }

  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ 
      error: "Session not found",
      sessionId 
    });
  }

  try {
    const message = JSON.stringify(req.body);
    console.log(`📨 [${sessionId}] Recibido mensaje: ${message.substring(0, 100)}...`);
    
    // Enviar mensaje al proceso stdio
    session.process.stdin.write(message + "\n");
    
    res.status(200).json({ 
      status: "sent",
      sessionId 
    });
  } catch (error) {
    console.error(`❌ [${sessionId}] Error al enviar mensaje:`, error);
    res.status(500).json({ 
      error: "Failed to send message",
      details: error.message 
    });
  }
});

// Endpoint para listar sesiones activas (útil para debug)
app.get("/sessions", (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    sessionId: id,
    pid: session.process.pid,
    createdAt: session.createdAt,
    alive: !session.process.killed
  }));
  
  res.json({
    count: sessions.size,
    sessions: sessionList
  });
});

// Endpoint para cerrar una sesión específica
app.delete("/sessions/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  
  if (session.process && !session.process.killed) {
    session.process.kill();
  }
  sessions.delete(sessionId);
  
  console.log(`🗑️ Sesión ${sessionId} eliminada manualmente`);
  res.json({ status: "deleted", sessionId });
});

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("🛑 Recibido SIGTERM, cerrando sesiones...");
  sessions.forEach((session, id) => {
    console.log(`🗑️ Cerrando sesión ${id}`);
    if (session.process && !session.process.killed) {
      session.process.kill();
    }
  });
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Recibido SIGINT, cerrando sesiones...");
  sessions.forEach((session, id) => {
    console.log(`🗑️ Cerrando sesión ${id}`);
    if (session.process && !session.process.killed) {
      session.process.kill();
    }
  });
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP Bridge corriendo en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`📨 Messages endpoint: POST http://localhost:${PORT}/messages`);
});