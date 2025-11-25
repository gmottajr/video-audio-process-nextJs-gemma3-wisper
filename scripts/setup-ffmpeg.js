#!/usr/bin/env node

/**
 * Setup FFmpeg Core Files
 * 
 * Automatically copies FFmpeg core files from node_modules to public/ffmpeg
 * This script runs after npm install (postinstall hook)
 * 
 * Cross-platform compatible (Windows, Linux, Mac)
 */

const fs = require('fs');
const path = require('path');

// Paths
const SOURCE_DIR = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'ffmpeg');

// Files to copy
const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function setupFFmpeg() {
  try {
    log('\n🚀 Setting up FFmpeg core files...', colors.cyan);

    // Check if source directory exists
    if (!fs.existsSync(SOURCE_DIR)) {
      log('❌ Error: @ffmpeg/core not found in node_modules', colors.red);
      log('   Run: npm install @ffmpeg/core', colors.yellow);
      process.exit(1);
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(TARGET_DIR)) {
      log('📁 Creating public/ffmpeg directory...', colors.cyan);
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Copy each file
    let totalSize = 0;
    for (const file of FILES) {
      const sourcePath = path.join(SOURCE_DIR, file);
      const targetPath = path.join(TARGET_DIR, file);

      if (!fs.existsSync(sourcePath)) {
        log(`⚠️  Warning: ${file} not found in source`, colors.yellow);
        continue;
      }

      // Copy file
      fs.copyFileSync(sourcePath, targetPath);

      // Get file size
      const stats = fs.statSync(targetPath);
      totalSize += stats.size;

      log(`✅ Copied: ${file} (${formatBytes(stats.size)})`, colors.green);
    }

    log(`\n✨ FFmpeg setup complete! Total: ${formatBytes(totalSize)}`, colors.green);
    log('   Files are ready in public/ffmpeg/\n', colors.cyan);

  } catch (error) {
    log('\n❌ Error setting up FFmpeg:', colors.red);
    log(`   ${error.message}`, colors.red);
    log('\n   You may need to run: npm run setup-ffmpeg\n', colors.yellow);
    // Don't fail the build, just warn
    process.exit(0);
  }
}

// Run setup
setupFFmpeg();

