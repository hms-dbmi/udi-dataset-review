import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const targets = [
  { platform: 'darwin', arch: 'x64' }, // macOS Intel
  { platform: 'darwin', arch: 'arm64' }, // macOS M1/M2
  { platform: 'win32', arch: 'x64' }, // Windows 64-bit
];

const DIST_DIR = 'dist/electron';
const RELEASE_DIR = 'release-builds';

if (!existsSync(RELEASE_DIR)) {
  mkdirSync(RELEASE_DIR);
}

for (const { platform, arch } of targets) {
  const tag = `${platform}-${arch}`;
  const cmd = `quasar build -m electron --target ${platform} --arch ${arch}`;
  console.log(`\n🔨 Building for: ${tag}\n=> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });

  const builtDir = join(DIST_DIR, `Packaged/UDI Review-${platform}-${arch}`);
  const releaseTarget = join(RELEASE_DIR, `${platform}-${arch}`);

  // Clean old copy
  execSync(`rm -rf "${releaseTarget}"`);

  console.log(`📦 Copying ${builtDir} → ${releaseTarget}`);
  execSync(`rsync -a "${builtDir}/" "${releaseTarget}/"`);
}

console.log('\n✅ All builds completed and copied to "release-builds" folder.');
