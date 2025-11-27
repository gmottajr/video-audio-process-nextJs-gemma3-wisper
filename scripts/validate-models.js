#!/usr/bin/env node

/**
 * Quick Model Validation Script
 * Runs before build/deploy to ensure all models are properly downloaded
 */

const fs = require('fs');
const path = require('path');

const MODELS = ['whisper-tiny', 'whisper-base', 'whisper-small'];
const REQUIRED_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'preprocessor_config.json',
  'generation_config.json',
  'onnx/decoder_model_merged_quantized.onnx',
  'onnx/encoder_model_quantized.onnx',
];

console.log('🔍 Validating Whisper Model Files...\n');

let allValid = true;
const issues = [];

MODELS.forEach((modelName) => {
  console.log(`📦 Checking ${modelName}...`);
  const modelPath = path.join(__dirname, '..', 'public', 'models', 'Xenova', modelName);

  if (!fs.existsSync(modelPath)) {
    issues.push(`❌ ${modelName}: Directory not found`);
    allValid = false;
    return;
  }

  REQUIRED_FILES.forEach((filename) => {
    const filePath = path.join(modelPath, filename);

    if (!fs.existsSync(filePath)) {
      issues.push(`❌ ${modelName}/${filename}: File missing`);
      allValid = false;
      return;
    }

    const stats = fs.statSync(filePath);
    
    // CRITICAL: Check for empty files (the bug we encountered)
    if (stats.size === 0) {
      issues.push(`❌ ${modelName}/${filename}: File is EMPTY (0 bytes)`);
      allValid = false;
      return;
    }

    // Check JSON files are valid
    if (filename.endsWith('.json')) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        
        if (Object.keys(json).length === 0) {
          issues.push(`⚠️  ${modelName}/${filename}: JSON is empty object`);
        }
      } catch (e) {
        issues.push(`❌ ${modelName}/${filename}: Invalid JSON - ${e.message}`);
        allValid = false;
        return;
      }
    }

    // Size indicator
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ ${filename} (${sizeMB} MB)`);
  });

  console.log('');
});

// Summary
console.log('═'.repeat(60));
if (allValid) {
  console.log('✅ All model files validated successfully!');
  console.log('═'.repeat(60));
  process.exit(0);
} else {
  console.log('❌ Validation Failed!');
  console.log('═'.repeat(60));
  console.log('\nIssues found:');
  issues.forEach(issue => console.log(issue));
  console.log('\n💡 Run: npm run setup-models');
  console.log('═'.repeat(60));
  process.exit(1);
}




