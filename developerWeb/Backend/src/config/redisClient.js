const { createClient } = require('redis');

function createMemoryRedis() {
  const store = new Map();
  const timers = new Map();
  const setTTL = (k, s) => {
    if (timers.has(k)) clearTimeout(timers.get(k));
    if (s) timers.set(k, setTimeout(() => { store.delete(k); timers.delete(k); }, s * 1000));
  };
  return {
    isOpen: true,
    async set(k, v, { EX, NX } = {}) { if (NX && store.has(k)) return null; store.set(k, v); if (EX) setTTL(k, EX); return 'OK'; },
    async get(k) { return store.get(k) ?? null; },
    async expire(k, s) { if (!store.has(k)) return 0; setTTL(k, s); return 1; },
    async getdel(k) { const v = store.get(k) ?? null; store.delete(k); if (timers.has(k)) { clearTimeout(timers.get(k)); timers.delete(k); } return v; },
    async sendCommand(args) { if (args[0] === 'GETDEL') return this.getdel(args[1]); throw new Error('Unsupported'); },
  };
}

let client;
async function connectRedis() {
  try {
    const c = createClient({ url: process.env.REDIS_URL });
    c.on('error', (e) => console.error('Redis error1:', process.env.REDIS_URL, e.message));
    await c.connect();
    console.log('Redis connected');
    // Polyfill getdel for Redis < 6.2 using Lua
    c.getdel = async (key) => {
      try { return await c.sendCommand(['GETDEL', key]); } catch {
        const lua = "local v=redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v;";
        return await c.eval(lua, { keys: [key] });
      }
    };
    client = c;
  } catch (e) {
    console.warn('Redis not available, using in-memory fallback');
    const mem = createMemoryRedis();
    client = mem;
  }
  return client;
}

const ready = connectRedis();
module.exports = { getRedis: () => ready };