const https = require('https');
const http = require('http');
const dns = require('dns');

// Helper: default options
const DEFAULT_TIMEOUT = 8000; // ms
const DEFAULT_RETRIES = 2;

function postJson(url, data, headers = {}, opts = {}) {
  const timeout = typeof opts.timeout === 'number' ? opts.timeout : DEFAULT_TIMEOUT;
  const retries = typeof opts.retries === 'number' ? opts.retries : DEFAULT_RETRIES;

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data || {});
    const isHttps = u.protocol === 'https:';

    let attempts = 0;

    const attempt = () => {
      attempts++;

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
        // prefer IPv4 to avoid IPv6 ENETUNREACH on some networks
        lookup: (hostname, lookupOpts, cb) => {
          // force family=4
          dns.lookup(hostname, { family: 4 }, cb);
        }
      };

      let timedOut = false;
      const req = (isHttps ? https : http).request(options, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => raw += chunk);
        res.on('end', () => {
          if (timedOut) return;
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

      const onError = (err) => {
        if (timedOut) return;
        if (attempts <= retries) {
          // small backoff
          setTimeout(attempt, 250 * attempts);
          return;
        }
        reject(err);
      };

      req.on('error', onError);

      // timeout handling
      req.setTimeout(timeout, () => {
        timedOut = true;
        req.destroy(new Error('Request timed out'));
      });

      try {
        req.write(body);
        req.end();
      } catch (e) {
        onError(e);
      }
    };

    attempt();
  });
}

module.exports = { postJson };
