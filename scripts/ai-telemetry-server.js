import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 9999;
const LOG_FILE = path.join(__dirname, '..', 'ai-telemetry.log');

const server = http.createServer((req, res) => {
  // Configurar CORS para permitir que o navegador e o emulador batam aqui
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
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
        const payload = JSON.parse(body);
        const logEntry = `[${new Date().toISOString()}] [${payload.type}] ${JSON.stringify(payload)}\n`;
        
        fs.appendFile(LOG_FILE, logEntry, (err) => {
          if (err) console.error('Erro ao escrever no log:', err);
        });

        console.log(`[+] Logged ${payload.type}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Erro ao fazer parse do payload:', err);
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 AI Telemetry Server rodando na porta ${PORT}`);
  console.log(`Gravando logs em: ${LOG_FILE}`);
});
