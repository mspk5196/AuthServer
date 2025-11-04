const https = require('https');
const http = require('http');

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const body = JSON.stringify(data || {});

      const isHttps = u.protocol === 'https:';
      const options = {
        method: 'POST',
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + (u.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      };

      const req = (isHttps ? https : http).request(options, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => raw += chunk);
        res.on('end', () => {
          try {
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              const json = raw ? JSON.parse(raw) : {};
              resolve(json);
            } else {
              resolve({ status: res.statusCode, text: raw });
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { postJson };
