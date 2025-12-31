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
        // Lookup helper: prefer IPv4 but fall back to IPv6 and then system default
        lookup: (hostname, lookupOpts, cb) => {
          const families = [];
          if (lookupOpts && lookupOpts.family) families.push(lookupOpts.family);
          // prefer 4 then 6
          families.push(4, 6);

          let idx = 0;
          const tryNext = () => {
            if (idx >= families.length) {
              return cb(new Error('DNS lookup failed for ' + hostname));
            }
            const fam = families[idx++];
            dns.lookup(hostname, { family: fam }, (err, address, family) => {
              if (!err && address) return cb(null, address, family);
              // otherwise try next family
              tryNext();
            });
          };
          tryNext();
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
