const fs = require("fs");
const path = require("path");

const { dataPath } = require("./data-path");

const SEED_DIR = path.join(process.cwd(), "data");
const cache = new Map();
let kvClient = null;
let kvChecked = false;

function useKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getKv() {
  if (kvChecked) return kvClient;
  kvChecked = true;
  if (!useKv()) return null;
  try {
    kvClient = require("@vercel/kv").kv;
  } catch {
    kvClient = null;
  }
  return kvClient;
}

function kvKey(filename) {
  return `abc:data:${filename}`;
}

function readSeed(filename) {
  const seedPath = path.join(SEED_DIR, filename);
  try {
    if (fs.existsSync(seedPath)) {
      return JSON.parse(fs.readFileSync(seedPath, "utf8"));
    }
  } catch {
    return null;
  }
  return null;
}

function readFs(filename) {
  try {
    const filePath = dataPath(filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch {
    return null;
  }
  return null;
}

async function readJson(filename, fallback) {
  if (cache.has(filename)) return cache.get(filename);

  const kv = getKv();
  if (kv) {
    const stored = await kv.get(kvKey(filename));
    if (stored != null) {
      cache.set(filename, stored);
      return stored;
    }
    const seed = readSeed(filename);
    const value = seed ?? fallback;
    if (seed != null) await kv.set(kvKey(filename), seed);
    cache.set(filename, value);
    return value;
  }

  const fromFs = readFs(filename);
  const value = fromFs ?? readSeed(filename) ?? fallback;
  cache.set(filename, value);
  return value;
}

async function writeJson(filename, data) {
  cache.set(filename, data);
  const kv = getKv();
  if (kv) {
    await kv.set(kvKey(filename), data);
    return;
  }
  const filePath = dataPath(filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getStorageMode() {
  if (useKv() && getKv()) return "vercel-kv";
  if (process.env.ABC_DATA_DIR) return "custom-dir";
  if (process.env.VERCEL) return "vercel-tmp";
  return "local-fs";
}

function clearCache(filename) {
  if (filename) cache.delete(filename);
  else cache.clear();
}

module.exports = {
  readJson,
  writeJson,
  useKv,
  getStorageMode,
  clearCache,
};