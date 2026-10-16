const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createGlobalCache } = require('../../src/utils/global-cache');

async function createTemporaryCache(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'global-cache-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return createGlobalCache(path.join(directory, 'global-cache.json'));
}

test('stores and retrieves values by key', async (t) => {
  const cache = await createTemporaryCache(t);
  await cache.setCache('bookingId', 'BK12345');
  await cache.setCache('eventTitle', 'Test Event');

  assert.equal(await cache.getCache('bookingId'), 'BK12345');
  assert.equal(await cache.getCache('eventTitle'), 'Test Event');
});

test('returns undefined for a missing key', async (t) => {
  const cache = await createTemporaryCache(t);
  assert.equal(await cache.getCache('missing'), undefined);
});

test('removes one key and preserves other values', async (t) => {
  const cache = await createTemporaryCache(t);
  await cache.setCache('bookingId', 'BK12345');
  await cache.setCache('eventTitle', 'Test Event');

  assert.equal(await cache.removeCache('bookingId'), true);
  assert.equal(await cache.getCache('bookingId'), undefined);
  assert.equal(await cache.getCache('eventTitle'), 'Test Event');
});

test('clears all values', async (t) => {
  const cache = await createTemporaryCache(t);
  await cache.setCache('bookingId', 'BK12345');
  await cache.clearCache();

  assert.equal(await cache.getCache('bookingId'), undefined);
});

test('updates a key without replacing other keys', async (t) => {
  const cache = await createTemporaryCache(t);
  await cache.setCache('bookingId', 'BK12345');
  await cache.setCache('eventTitle', 'Test Event');
  await cache.setCache('bookingId', 'BK54321');

  assert.equal(await cache.getCache('bookingId'), 'BK54321');
  assert.equal(await cache.getCache('eventTitle'), 'Test Event');
});
