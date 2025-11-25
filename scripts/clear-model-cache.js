/**
 * Clear Model Cache Script
 * 
 * This script clears all caches related to model files:
 * - Deletes .next build cache
 * - Removes and re-downloads model files
 * 
 * Use this when you encounter model loading issues due to cached empty/corrupted files.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧹 Model Cache Clearing Script');
console.log('═'.repeat(60));

// 1. Clear Next.js build cache
const nextCacheDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextCacheDir)) {
  console.log('\n📁 Removing .next build cache...');
  fs.rmSync(nextCacheDir, { recursive: true, force: true });
  console.log('✅ .next cache cleared');
} else {
  console.log('\n✓ No .next cache to clear');
}

// 2. List current model files
console.log('\n📊 Current Model Files:');
const modelsDir = path.join(process.cwd(), 'public', 'models', 'Xenova');
if (fs.existsSync(modelsDir)) {
  const models = fs.readdirSync(modelsDir);
  models.forEach(modelName => {
    const modelPath = path.join(modelsDir, modelName);
    const files = fs.readdirSync(modelPath);
    console.log(`\n  📦 ${modelName}:`);
    files.forEach(file => {
      const filePath = path.join(modelPath, file);
      const stats = fs.statSync(filePath);
      
      // Handle directories differently
      if (stats.isDirectory()) {
        console.log(`     📁 ${file}/ (directory)`);
        return;
      }
      
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const sizeDisplay = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      
      // Flag suspicious files
      if (stats.size === 0) {
        console.log(`     ❌ ${file}: ${sizeDisplay} (EMPTY - WILL BE REMOVED)`);
      } else if (file.endsWith('.json') && stats.size < 50) {
        console.log(`     ⚠️  ${file}: ${sizeDisplay} (SUSPICIOUSLY SMALL - LIKELY CORRUPTED)`);
      } else {
        console.log(`     ✓ ${file}: ${sizeDisplay}`);
      }
    });
  });
}

// 3. Remove empty/corrupted model files
console.log('\n\n🔍 Checking for empty or corrupted files...');
let foundIssues = false;

function checkModelFiles(modelPath) {
  const files = fs.readdirSync(modelPath);
  const issues = [];
  
  files.forEach(file => {
    const filePath = path.join(modelPath, file);
    const stats = fs.statSync(filePath);
    
    // Skip directories
    if (stats.isDirectory()) {
      return;
    }
    
    // Check for empty files
    if (stats.size === 0) {
      issues.push({ file, reason: 'empty (0 bytes)' });
      fs.unlinkSync(filePath);
    }
    // Check for corrupted JSON files (less than 50 bytes is likely corrupted)
    else if (file.endsWith('.json') && stats.size < 50) {
      issues.push({ file, reason: `suspiciously small (${stats.size} bytes)` });
      fs.unlinkSync(filePath);
    }
  });
  
  return issues;
}

if (fs.existsSync(modelsDir)) {
  const models = fs.readdirSync(modelsDir);
  models.forEach(modelName => {
    const modelPath = path.join(modelsDir, modelName);
    const issues = checkModelFiles(modelPath);
    
    if (issues.length > 0) {
      foundIssues = true;
      console.log(`\n  ❌ ${modelName}:`);
      issues.forEach(({ file, reason }) => {
        console.log(`     • ${file} - ${reason} (REMOVED)`);
      });
    }
  });
}

if (!foundIssues) {
  console.log('  ✓ No issues found');
}

// 4. Instructions
console.log('\n\n📋 Next Steps:');
console.log('═'.repeat(60));
console.log('1. ✅ Server-side caches cleared');
console.log('2. 🔄 Re-download models: npm run setup-models');
console.log('3. 🌐 Clear browser cache:');
console.log('   • Chrome: Ctrl+Shift+Delete → "Cached images and files" → Clear');
console.log('   • Firefox: Ctrl+Shift+Delete → "Cache" → Clear');
console.log('   • Edge: Ctrl+Shift+Delete → "Cached images and files" → Clear');
console.log('4. 🔄 Hard refresh: Ctrl+Shift+R or Ctrl+F5');
console.log('5. 🚀 Restart dev server: npm run dev');
console.log('\n💡 TIP: For stubborn cache issues, try:');
console.log('   • Open browser DevTools (F12)');
console.log('   • Right-click refresh button → "Empty Cache and Hard Reload"');
console.log('   • Or use Incognito/Private browsing mode');
console.log('═'.repeat(60));
console.log('\n✅ Cache clearing complete!\n');

