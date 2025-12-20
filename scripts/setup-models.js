const fs = require('fs');
const path = require('path');
const https = require('https');

// Support multiple Whisper models for user choice
// Note: Medium model removed due to browser WASM memory limits causing OOM errors
const MODELS = [
  {
    name: 'Xenova/whisper-tiny',
    size: '39 MB',
    description: 'Fastest, basic quality'
  },
  {
    name: 'Xenova/whisper-base',
    size: '74 MB',
    description: 'Fast, good quality (recommended)'
  },
  {
    name: 'Xenova/whisper-small',
    size: '244 MB',
    description: 'Best quality available in browser'
  }
];

// Files required for all Whisper models (Quantized)
const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'preprocessor_config.json',
  'generation_config.json',
  'onnx/decoder_model_merged_quantized.onnx',
  'onnx/encoder_model_quantized.onnx',
];

/**
 * Download a file from Hugging Face
 */
function downloadFile(modelName, filename, outputDir) {
  return new Promise((resolve, reject) => {
    const baseUrl = `https://huggingface.co/${modelName}/resolve/main/`;
    
    // Handle subdirectories (e.g., onnx/file.onnx)
    const dest = path.join(outputDir, filename);
    const dir = path.dirname(dest);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Skip if file already exists
    if (fs.existsSync(dest)) {
      console.log(`   ✅ ${filename} already exists`);
      resolve();
      return;
    }

    console.log(`   ⬇️  Downloading ${filename}...`);
    const file = fs.createWriteStream(dest);

    https.get(baseUrl + filename, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = new URL(response.headers.location, baseUrl);
        https.get(redirectUrl.href, (redirectResponse) => {
          if (redirectResponse.statusCode !== 200) {
            console.error(`   ❌ Failed to download ${filename}: Status ${redirectResponse.statusCode}`);
            fs.unlink(dest, () => {});
            reject(new Error(`HTTP ${redirectResponse.statusCode}`));
            return;
          }

          const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
          let downloadedSize = 0;

          redirectResponse.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const percent = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
            process.stdout.write(`\r   ⬇️  Downloading ${filename}... ${percent}%`);
          });

          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`\n   ✅ Downloaded ${filename}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => {});
          console.error(`\n❌ Error downloading ${filename}: ${err.message}`);
          reject(err);
        });
        return;
      }

      if (response.statusCode !== 200) {
        console.error(`   ❌ Failed to download ${filename}: Status ${response.statusCode}`);
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
        process.stdout.write(`\r   ⬇️  Downloading ${filename}... ${percent}%`);
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`\n   ✅ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error(`\n❌ Error downloading ${filename}: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Copy Transformers.js library from node_modules to public
 */
function copyTransformersLib() {
  const srcPath = path.join(__dirname, '..', 'node_modules', '@xenova', 'transformers', 'dist', 'transformers.min.js');
  const destPath = path.join(__dirname, '..', 'public', 'transformers.min.js');

  if (!fs.existsSync(srcPath)) {
    console.error('❌ Transformers.js not found in node_modules. Run npm install first.');
    return false;
  }

  if (fs.existsSync(destPath)) {
    console.log('✅ transformers.min.js already exists in public/');
    return true;
  }

  console.log('📦 Copying transformers.min.js to public/...');
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log('✅ Transformers.js library copied successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to copy Transformers.js:', error.message);
    return false;
  }
}

/**
 * Download a single model
 */
async function downloadModel(modelConfig) {
  const outputDir = path.join(__dirname, '..', 'public', 'models', modelConfig.name);
  
  console.log(`\n📦 ${modelConfig.name}`);
  console.log(`   Size: ${modelConfig.size} | ${modelConfig.description}`);
  console.log(`   Output: ${outputDir}`);

  // Create directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Download all files
  for (const file of FILES) {
    try {
      await downloadFile(modelConfig.name, file, outputDir);
    } catch (error) {
      console.error(`\n   ❌ Failed to download ${file}:`, error.message);
      throw error;
    }
  }
  
  console.log(`   ✅ ${modelConfig.name} complete!\n`);
}

/**
 * Main setup function
 */
async function setupModels() {
  console.log(`\n🤖 Setting up AI Transcription with Multiple Models`);
  console.log(`═`.repeat(60));
  
  // Step 1: Copy Transformers.js library
  console.log('\n📚 Step 1: Copy Transformers.js library');
  const libCopied = copyTransformersLib();
  if (!libCopied) {
    console.error('⚠️  Warning: Transformers.js library not available');
  }

  // Step 2: Download all models
  console.log(`\n📥 Step 2: Download Whisper Models`);
  console.log(`   Available models: ${MODELS.length}`);
  console.log(`   Files per model: ${FILES.length}`);
  
  let successCount = 0;
  let failCount = 0;

  for (const model of MODELS) {
    try {
      await downloadModel(model);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to setup ${model.name}`);
      failCount++;
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ Setup Complete!`);
  console.log(`   • Models downloaded: ${successCount}/${MODELS.length}`);
  if (failCount > 0) {
    console.log(`   • Failed: ${failCount}`);
  }
  console.log(`   • Library: public/transformers.min.js`);
  console.log(`   • Models: public/models/Xenova/whisper-*`);
  console.log(`${'═'.repeat(60)}\n`);
}

// Run
setupModels().catch((error) => {
  console.error('\n❌ Model setup failed:', error);
  process.exit(1);
});

