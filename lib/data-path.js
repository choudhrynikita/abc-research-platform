const fs = require("fs");
const path = require("path");

let dataDir = null;

function getDataDir() {
  if (dataDir) return dataDir;

  if (process.env.ABC_DATA_DIR) {
    const customDir = path.resolve(process.env.ABC_DATA_DIR);
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    dataDir = customDir;
    return dataDir;
  }

  if (process.env.VERCEL) {
    const tmpDir = path.join("/tmp", "abc-data");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const seedDir = path.join(process.cwd(), "data");
    if (fs.existsSync(seedDir)) {
      for (const file of fs.readdirSync(seedDir)) {
        const dest = path.join(tmpDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(seedDir, file), dest);
        }
      }
    }
    dataDir = tmpDir;
    return dataDir;
  }

  dataDir = path.join(process.cwd(), "data");
  return dataDir;
}

function dataPath(filename) {
  return path.join(getDataDir(), filename);
}

function resetDataDir(dir = null) {
  dataDir = dir;
}

module.exports = { getDataDir, dataPath, resetDataDir };