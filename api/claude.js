const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if(req.method === 'OPTIONS'){ res.status(204).end(); return; }
  if(req.method !== 'POST'){ res.status(405).json({error:'Method not allowed'}); return; }

  const apiKey = req.headers['x-api-key'] || '';
  if(!apiKey){ res.status(400).json({error:'Missing API key'}); return; }

  return new Promise((resolve) => {
    const body = JSON.stringify(req.body);
    const opts = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    };

    const proxy = https.request(opts, r => {
      let data = '';
      r.on('data', d => data += d);
      r.on('end', () => {
        res.status(r.statusCode).setHeader('Content-Type', 'application/json').end(data);
        resolve();
      });
    });

    proxy.on('error', e => {
      res.status(500).json({error: e.message});
      resolve();
    });

    proxy.write(body);
    proxy.end();
  });
};
