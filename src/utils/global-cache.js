const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_CACHE_PATH = path.resolve(__dirname, '..', '..', 'global-cache.json');

function createGlobalCache(filePath = DEFAULT_CACHE_PATH) {
  const cachePath = path.resolve(filePath);

  async function readCache() {
    try {
      const contents = await fs.readFile(cachePath, 'utf8');
      return contents.trim() ? JSON.parse(contents) : {};
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  async function writeCache(cache) {
    await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  }

  return {
    async setCache(key, value) {
      const cache = await readCache();
      Object.defineProperty(cache, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
      await writeCache(cache);
    },

    async getCache(key) {
      const cache = await readCache();
      return Object.hasOwn(cache, key) ? cache[key] : undefined;
    },

    async removeCache(key) {
      const cache = await readCache();
      if (!Object.hasOwn(cache, key)) return false;
      delete cache[key];
      await writeCache(cache);
      return true;
    },

    async clearCache() {
      await writeCache({});
    },
  };
}

const globalCache = createGlobalCache();

module.exports = {
  createGlobalCache,
  setCache: (key, value) => globalCache.setCache(key, value),
  getCache: (key) => globalCache.getCache(key),
  removeCache: (key) => globalCache.removeCache(key),
  clearCache: () => globalCache.clearCache(),
};
