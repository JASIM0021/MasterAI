const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Parse a .env file into a key-value object (no external deps)
function parseEnv(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const result = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
      if (match) result[match[1].trim()] = match[2].trim();
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Modify android/app/build.gradle to:
 *  1. Load key.properties before the android { block
 *  2. Add a `release` signingConfig that reads from those properties
 *  3. Wire release buildType to use signingConfigs.release
 */
function modifyBuildGradle(contents) {
  // ── 1. Inject key.properties loader ───────────────────────────────────────
  if (!contents.includes('keystorePropertiesFile')) {
    contents = contents.replace(
      /^(android \{)/m,
      `def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

$1`
    );
  }

  // ── 2. Add release signingConfig block after the debug block ───────────────
  //    Matches the entire debug { ... } block inside signingConfigs and appends
  //    the release block right after it.
  if (!contents.includes('keystoreProperties[')) {
    contents = contents.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n(\s*)\})/,
      (match, p1, indent) =>
        `${p1}\n${indent}release {\n` +
        `${indent}    storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null\n` +
        `${indent}    storePassword keystoreProperties['storePassword']\n` +
        `${indent}    keyAlias keystoreProperties['keyAlias']\n` +
        `${indent}    keyPassword keystoreProperties['keyPassword']\n` +
        `${indent}}`
    );
  }

  // ── 3. Point release buildType to signingConfigs.release ──────────────────
  //    Only replaces inside "release {" block, not inside "debug {"
  if (!contents.includes('signingConfig signingConfigs.release')) {
    contents = contents.replace(
      /(buildTypes[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );
  }

  return contents;
}

const withAndroidReleaseKey = (config) => {
  // ── Step A: copy keystore + write key.properties (file system ops) ────────
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = cfg.modRequest.platformProjectRoot; // <project>/android

      // Read signing values from .env
      const env = parseEnv(path.join(projectRoot, '.env'));
      const storeFile = env.MYAPP_UPLOAD_STORE_FILE || 'mm-key';
      const keyAlias = env.MYAPP_UPLOAD_KEY_ALIAS || '';
      const storePassword = env.MYAPP_UPLOAD_STORE_PASSWORD || '';
      const keyPassword = env.MYAPP_UPLOAD_KEY_PASSWORD || '';

      // Copy keystore → android/app/<storeFile>
      const src = path.join(projectRoot, storeFile);
      const dest = path.join(androidRoot, 'app', storeFile);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`[withAndroidReleaseKey] keystore → ${dest}`);
      } else {
        console.warn(`[withAndroidReleaseKey] keystore not found: ${src}`);
      }

      // Write android/key.properties  (git-ignored, never committed)
      const keyProps = [
        `storeFile=${storeFile}`,
        `storePassword=${storePassword}`,
        `keyAlias=${keyAlias}`,
        `keyPassword=${keyPassword}`,
      ].join('\n');
      fs.writeFileSync(path.join(androidRoot, 'key.properties'), keyProps, 'utf8');
      console.log(`[withAndroidReleaseKey] key.properties written`);

      return cfg;
    },
  ]);

  // ── Step B: patch build.gradle ────────────────────────────────────────────
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = modifyBuildGradle(cfg.modResults.contents);
    return cfg;
  });

  return config;
};

module.exports = withAndroidReleaseKey;
