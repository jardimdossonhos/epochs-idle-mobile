const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'ai-brain.log');

// Limpa o arquivo de log ao iniciar o servidor
fs.writeFileSync(LOG_FILE, '');
console.log(`[AI Telemetry] Servidor inciado. Logs serao salvos em: ${LOG_FILE}`);

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const timestamp = new Date().toISOString();
        
        let logEntry = `\n======================================================\n`;
        logEntry += `[${timestamp}] TYPE: ${data.type}\n`;
        
        if (data.type === 'STATE_DUMP') {
          logEntry += `GAME STATE DUMP:\n`;
          logEntry += JSON.stringify(data.state, null, 2);
        } else if (data.type === 'ERROR') {
          logEntry += `ERROR MESSAGE:\n${data.message}\n`;
          if (data.stack) logEntry += `STACK TRACE:\n${data.stack}\n`;
        } else {
          logEntry += `PAYLOAD:\n${JSON.stringify(data.payload, null, 2)}`;
        }
        
        logEntry += `\n======================================================\n`;
        
        fs.appendFileSync(LOG_FILE, logEntry);
        console.log(`[AI Telemetry] Recebido evento: ${data.type}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        console.error('Erro ao processar log', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 9999;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI Telemetry] Escutando na porta ${PORT}`);
});
