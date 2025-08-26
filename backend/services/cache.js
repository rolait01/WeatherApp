class TTLCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttl = ttlMs;
    this.map = new Map();
  }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expires) {
      this.map.delete(key);
      return null;
    }
    return hit.value;
  }
  set(key, value) {
    this.map.set(key, { value, expires: Date.now() + this.ttl });
  }
}
export const weatherCache = new TTLCache(5 * 60 * 1000);
