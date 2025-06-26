#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';

// Simple DrizzleDetector test directly inline
async function checkFiles(projectPath, filePaths) {
  const existing = [];
  const missing = [];
  
  for (const filePath of filePaths) {
    const fullPath = path.join(projectPath, filePath);
    const fileExists = await fs.pathExists(fullPath);
    
    if (fileExists) {
      existing.push({
        relative: filePath,
        absolute: fullPath
      });
    } else {
      missing.push(filePath);
    }
  }
  
  return { existing, missing };
}

async function checkPackageJsonDependencies(projectPath, dependencies) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const found = dependencies.filter(dep => dep in allDeps);
    const missing = dependencies.filter(dep => !(dep in allDeps));
    
    return { found, missing };
  } catch (error) {
    return { found: [], missing: dependencies };
  }
}

async function testDrizzleDetection(projectPath) {
  console.log(`🔍 Drizzle Detection starting in: ${projectPath}`);
  
  // Check for drizzle.config.ts/js files in root and common monorepo patterns
  const configFiles = [
    'drizzle.config.ts',
    'drizzle.config.js',
    'drizzle.config.mjs'
  ];
  
  // Also check in common monorepo locations
  const monorepoConfigFiles = [
    ...configFiles, // root level
    ...configFiles.map(f => `apps/server/${f}`),
    ...configFiles.map(f => `apps/api/${f}`),
    ...configFiles.map(f => `packages/server/${f}`),
    ...configFiles.map(f => `packages/api/${f}`),
    ...configFiles.map(f => `backend/${f}`),
    ...configFiles.map(f => `server/${f}`)
  ];
  
  console.log(`🔍 Searching for config files:`, monorepoConfigFiles);
  
  const { existing: configFilesFound } = await checkFiles(projectPath, monorepoConfigFiles);
  console.log(`✅ Config files found:`, configFilesFound.map(f => f.relative));
   
   // Check for package.json with drizzle dependencies - check root and config directories
   console.log(`🔍 Checking root dependencies in: ${projectPath}`);
   let deps = await checkPackageJsonDependencies(projectPath, ['drizzle-orm', 'drizzle-kit']);
   console.log(`📦 Root dependencies found:`, deps.found);
   
   // Also check for dependencies in the same directory as any found config files
   for (const configFile of configFilesFound) {
     const configDir = path.dirname(configFile.absolute);
     console.log(`🔍 Checking dependencies in config dir: ${configDir}`);
     const configDeps = await checkPackageJsonDependencies(configDir, ['drizzle-orm', 'drizzle-kit']);
     console.log(`📦 Config dir dependencies found:`, configDeps.found);
     // Merge the found dependencies
     deps.found = [...new Set([...deps.found, ...configDeps.found])];
   }
   
   console.log(`📦 Total dependencies found:`, deps.found);
   
   return {
     configFiles: configFilesFound,
     dependencies: deps.found
   };
}

const projectPath = '/home/gl1/gl1.chat';

console.log('🚀 Starting manual detection test...');
console.log(`Project path: ${projectPath}`);

try {
  const result = await testDrizzleDetection(projectPath);
  console.log('\n📊 Detection Result:');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Detection failed:', error);
}