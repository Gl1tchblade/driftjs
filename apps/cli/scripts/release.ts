import fs from 'fs/promises';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');

async function bumpVersion() {
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    const currentVersion: string = packageJson.version;
    
    if (!currentVersion) {
      throw new Error('Version not found in package.json');
    }

    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`Invalid version format: ${currentVersion}`);
    }

    const newVersion = `${major}.${minor}.${patch + 1}`;
    packageJson.version = newVersion;
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Version bumped to ${newVersion}`);
  } catch (error) {
    console.error(`Error bumping version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

bumpVersion(); 