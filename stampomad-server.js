#!/usr/bin/env node
// Stampomad local server — run with: node stampomad-server.js
// Then open: http://localhost:4000

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const DIR = __dirname;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if(req.method === 'OPTIONS'){
    res.writeHead(204); res.end(); return;
  }

  // Proxy Anthropic API calls
  if(req.url === '/api/claude' && req.method === 'POST'){
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const apiKey = req.headers['x-api-key'] || '';
      console.log('→ Proxying to Anthropic, key starts with:', apiKey.slice(0,20));
      
      let parsed;
      try { parsed = JSON.parse(body); } catch(e) {}
      console.log('→ Model:', parsed?.model, '| Max tokens:', parsed?.max_tokens);

      const opts = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        }
      };
      const proxy = https.request(opts, r => {
        let respBody = '';
        r.on('data', d => respBody += d);
        r.on('end', () => {
          console.log('← Anthropic status:', r.statusCode);
          if(r.statusCode !== 200) console.log('← Error body:', respBody.slice(0, 300));
          res.writeHead(r.statusCode, {
            'Content-Type': r.headers['content-type'] || 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(respBody);
        });
      });
      proxy.on('error', e => {
        console.log('← Proxy error:', e.message);
        res.writeHead(500);
        res.end(JSON.stringify({error: {message: e.message}}));
      });
      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // Serve static files
  let filePath = path.join(DIR, req.url === '/' ? '/index.html' : req.url);
  if(!path.extname(filePath)) filePath += '.html';

  fs.readFile(filePath, (err, data) => {
    if(err){ res.writeHead(404); res.end('Not found: ' + filePath); return; }
    const ext = path.extname(filePath);
    const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
    res.writeHead(200, {'Content-Type': types[ext] || 'text/plain'});
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Stampomad server running!`);
  console.log(`👉 Open: http://localhost:${PORT}/stampomad.html\n`);
});
