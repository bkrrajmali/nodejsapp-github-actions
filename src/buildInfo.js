const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const BUILD_INFO_FILE = path.join(__dirname, '..', 'dist', 'build-info.json');

let cached;

/**
 * Build metadata comes from (in order):
 *   1. environment variables injected at docker build / deploy time
 *   2. dist/build-info.json written by `npm run build`
 *   3. package.json defaults
 */
function getBuildInfo() {
  if (cached) return cached;

  let fileInfo = {};
  try {
    fileInfo = JSON.parse(fs.readFileSync(BUILD_INFO_FILE, 'utf8'));
  } catch {
    // no build file yet (e.g. running straight from source)
  }

  cached = {
    version: process.env.APP_VERSION || fileInfo.version || pkg.version,
    commit: process.env.GIT_SHA || fileInfo.commit || 'local',
    builtAt: process.env.BUILD_TIME || fileInfo.builtAt || null,
    runId: process.env.BUILD_RUN_ID || fileInfo.runId || null,
  };
  return cached;
}

function resetBuildInfoCache() {
  cached = undefined;
}

module.exports = { getBuildInfo, resetBuildInfoCache };
