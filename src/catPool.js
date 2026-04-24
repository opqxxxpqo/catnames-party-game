const DEFAULT_URL = "https://cataas.com/api/cats?limit=100";
const TTL_MS = 60 * 60 * 1000;

let cache = null;
let pending = null;

async function ensurePool(fetchImpl = globalThis.fetch, url = DEFAULT_URL) {
  if (cache && cache.expiresAt > Date.now()) return cache.ids;
  if (pending) return pending;
  pending = (async () => {
    try {
      if (typeof fetchImpl !== "function") {
        throw new Error("当前运行时没有可用的 fetch");
      }
      const res = await fetchImpl(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`CATAAS 响应 ${res.status}`);
      const data = await res.json();
      const ids = (Array.isArray(data) ? data : [])
        .map((item) => item && (item.id || item._id))
        .filter((id) => typeof id === "string" && id.length > 0);
      if (!ids.length) throw new Error("CATAAS 返回为空");
      cache = { ids, expiresAt: Date.now() + TTL_MS };
      return ids;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

async function pickRandom(count, fetchImpl) {
  const ids = await ensurePool(fetchImpl);
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(shuffled[i % shuffled.length]);
  }
  return picked;
}

function resetCache() {
  cache = null;
  pending = null;
}

module.exports = { ensurePool, pickRandom, resetCache };
