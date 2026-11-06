// "Compile" step for the pipeline: checks every source file parses
// and writes dist/build-info.json with version + commit metadata.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pkg = require('../package.json');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js'));
for (const file of files) {
  execSync(`node --check "${path.join(srcDir, file)}"`, { stdio: 'inherit' });
}
console.log(`✔ Syntax check passed for ${files.length} source files`);

let commit = process.env.GITHUB_SHA || 'local';
if (commit === 'local') {
  try {
    commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    // not a git checkout
  }
}

const info = {
  version: pkg.version,
  commit: commit.slice(0, 7),
  builtAt: new Date().toISOString(),
  runId: process.env.GITHUB_RUN_ID || null,
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'build-info.json'), JSON.stringify(info, null, 2));
console.log('✔ Wrote dist/build-info.json', info);
