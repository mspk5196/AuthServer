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
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      if (process.env.DEBUG_HTTPCLIENT) console.debug('[httpClient] Invalid URL passed to postJson:', url, e);
      return reject(new Error('Invalid URL: ' + url));
    }
    const body = JSON.stringify(data || {});
    const isHttps = u.protocol === 'https:';

    let attempts = 0;

    const attempt = async () => {
      attempts++;

      // Resolve hostname first (prefer IPv4 then IPv6), then call request with numeric IP
      let resolvedAddress = null;
      let resolvedFamily = null;
      try {
        const addrs = await new Promise((res, rej) => dns.lookup(u.hostname, { all: true }, (err, a) => err ? rej(err) : res(a)));
        if (process.env.DEBUG_HTTPCLIENT) console.debug('[httpClient] dns.lookup(all) addrs for', u.hostname, addrs);
        const chosen = (addrs && addrs.length) ? (addrs.find(a => a && a.family === 4 && a.address) || addrs.find(a => a && a.family === 6 && a.address) || addrs.find(a => a && a.address)) : null;
        if (!chosen || !chosen.address) {
          if (process.env.DEBUG_HTTPCLIENT) console.debug('[httpClient] dns.lookup(all) none chosen, falling back to single lookup for', u.hostname);
          const fallback = await new Promise((res, rej) => dns.lookup(u.hostname, (err, address, family) => err ? rej(err) : res({ address, family })));
          resolvedAddress = fallback.address;
          resolvedFamily = fallback.family;
        } else {
          resolvedAddress = chosen.address;
          resolvedFamily = chosen.family;
        }
      } catch (e) {
        if (process.env.DEBUG_HTTPCLIENT) console.debug('[httpClient] dns.lookup failed for', u.hostname, e);
        // let the request itself attempt to resolve using system behavior
      }

      const options = {
        method: 'POST',
        hostname: resolvedAddress || u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + (u.search || ''),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Host: u.hostname,
          ...headers,
        },
        // if we resolved to an IP and it's HTTPS, set servername for SNI
        servername: resolvedAddress ? u.hostname : undefined,
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
