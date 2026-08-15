/**
 * Cross-platform test runner.
 * Linux npm does not expand nested globs, so we collect files ourselves.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const testsDir = path.join(__dirname, "..", "tests");

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return collect(full);
    return ent.name.endsWith(".test.js") ? [full] : [];
  });
}

const files = collect(testsDir);
if (!files.length) {
  console.error("No *.test.js files found under tests/");
  process.exit(1);
}

const child = spawn(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  windowsHide: true,
});
child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
