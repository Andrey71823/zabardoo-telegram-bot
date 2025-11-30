#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);

async function ensureDir(directory) {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function copyDirectory(source, destination) {
  const sourceStat = await stat(source);
  if (!sourceStat.isDirectory()) {
    throw new Error(`Source path ${source} is not a directory`);
  }

  await ensureDir(destination);
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await ensureDir(path.dirname(destPath));
      await copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const projectRoot = process.cwd();
  const distDir = path.join(projectRoot, 'dist');
  const publicDir = path.join(projectRoot, 'public');
  const databaseDir = path.join(projectRoot, 'database');

  await ensureDir(distDir);

  if (fs.existsSync(publicDir)) {
    await copyDirectory(publicDir, path.join(distDir, 'public'));
  }

  if (fs.existsSync(databaseDir)) {
    await copyDirectory(databaseDir, path.join(distDir, 'database'));
  }

  console.log('Assets copied successfully.');
}

main().catch(error => {
  console.error('Failed to copy assets:', error);
  process.exit(1);
});
