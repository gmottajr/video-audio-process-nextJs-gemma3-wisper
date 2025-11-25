/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');

describe('Whisper Model Files Validation', () => {
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

  const EXPECTED_SIZES = {
    'whisper-tiny': {
      'config.json': 2000, // Minimum size in bytes
      'tokenizer.json': 2400000,
      'tokenizer_config.json': 280000,
      'preprocessor_config.json': 300,
      'generation_config.json': 3500,
      'onnx/decoder_model_merged_quantized.onnx': 29000000, // ~29MB (quantized)
      'onnx/encoder_model_quantized.onnx': 9000000, // ~9MB (quantized)
    },
    'whisper-base': {
      'config.json': 2000,
      'tokenizer.json': 2400000,
      'tokenizer_config.json': 280000,
      'preprocessor_config.json': 300,
      'generation_config.json': 3500,
      'onnx/decoder_model_merged_quantized.onnx': 51000000, // ~51MB (quantized)
      'onnx/encoder_model_quantized.onnx': 22000000, // ~22MB (quantized)
    },
    'whisper-small': {
      'config.json': 2000, // CRITICAL: This must not be 0!
      'tokenizer.json': 2400000,
      'tokenizer_config.json': 280000,
      'preprocessor_config.json': 300,
      'generation_config.json': 3500,
      'onnx/decoder_model_merged_quantized.onnx': 149000000, // ~149MB (quantized)
      'onnx/encoder_model_quantized.onnx': 88000000, // ~88MB (quantized)
    },
  };

  describe.each(MODELS)('%s model', (modelName) => {
    const modelPath = path.join(process.cwd(), 'public', 'models', 'Xenova', modelName);

    test('model directory exists', () => {
      expect(fs.existsSync(modelPath)).toBe(true);
    });

    describe.each(REQUIRED_FILES)('file: %s', (filename) => {
      const filePath = path.join(modelPath, filename);

      test('exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      test('is not empty', () => {
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      });

      test('meets minimum size requirement', () => {
        const stats = fs.statSync(filePath);
        const minSize = EXPECTED_SIZES[modelName][filename];
        
        expect(stats.size).toBeGreaterThanOrEqual(minSize);
      });

      if (filename.endsWith('.json')) {
        test('is valid JSON', () => {
          const content = fs.readFileSync(filePath, 'utf-8');
          expect(() => JSON.parse(content)).not.toThrow();
        });

        test('JSON is not empty object', () => {
          const content = fs.readFileSync(filePath, 'utf-8');
          const json = JSON.parse(content);
          expect(Object.keys(json).length).toBeGreaterThan(0);
        });
      }
    });

    describe('config.json specific validation', () => {
      const configPath = path.join(modelPath, 'config.json');

      test('contains required Whisper config fields', () => {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        expect(config).toHaveProperty('model_type', 'whisper');
        expect(config).toHaveProperty('d_model');
        expect(config).toHaveProperty('encoder_layers');
        expect(config).toHaveProperty('decoder_layers');
        expect(config).toHaveProperty('vocab_size');
      });

      test('has correct architecture', () => {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        expect(config.architectures).toContain('WhisperForConditionalGeneration');
      });

      test('is NOT an empty file (regression test for bug)', () => {
        const stats = fs.statSync(configPath);
        
        // This is the critical test that would have caught the bug!
        expect(stats.size).toBeGreaterThan(0);
        
        // More specific: should be at least 2KB
        expect(stats.size).toBeGreaterThan(2000);
      });
    });

    describe('tokenizer.json validation', () => {
      const tokenizerPath = path.join(modelPath, 'tokenizer.json');

      test('contains vocab', () => {
        const content = fs.readFileSync(tokenizerPath, 'utf-8');
        const tokenizer = JSON.parse(content);

        expect(tokenizer).toHaveProperty('model');
        expect(tokenizer).toHaveProperty('added_tokens');
      });
    });

    describe('ONNX model files', () => {
      const onnxDirPath = path.join(modelPath, 'onnx');

      test('onnx folder exists', () => {
        expect(fs.existsSync(onnxDirPath)).toBe(true);
      });

      test('onnx is a DIRECTORY, not a file (regression test)', () => {
        // This catches the bug where the cache-clearing script
        // incorrectly reported onnx as "0 bytes empty file"
        const stats = fs.statSync(onnxDirPath);
        expect(stats.isDirectory()).toBe(true);
        expect(stats.isFile()).toBe(false);
      });

      test('onnx directory is not empty', () => {
        const files = fs.readdirSync(onnxDirPath);
        expect(files.length).toBeGreaterThan(0);
        
        // Should contain at least the 2 required ONNX files
        expect(files.length).toBeGreaterThanOrEqual(2);
      });

      test('onnx directory contains required model files', () => {
        const files = fs.readdirSync(onnxDirPath);
        
        expect(files).toContain('decoder_model_merged_quantized.onnx');
        expect(files).toContain('encoder_model_quantized.onnx');
      });

      test('decoder model is present and large enough', () => {
        const decoderPath = path.join(modelPath, 'onnx', 'decoder_model_merged_quantized.onnx');
        const stats = fs.statSync(decoderPath);
        
        // Verify it's a file, not a directory
        expect(stats.isFile()).toBe(true);
        
        // Decoder (quantized): ~29MB for tiny, ~51MB for base, ~149MB for small
        const minSize = EXPECTED_SIZES[modelName]['onnx/decoder_model_merged_quantized.onnx'];
        expect(stats.size).toBeGreaterThanOrEqual(minSize);
      });

      test('encoder model is present and large enough', () => {
        const encoderPath = path.join(modelPath, 'onnx', 'encoder_model_quantized.onnx');
        const stats = fs.statSync(encoderPath);
        
        // Verify it's a file, not a directory
        expect(stats.isFile()).toBe(true);
        
        // Encoder (quantized): ~9MB for tiny, ~22MB for base, ~88MB for small
        const minSize = EXPECTED_SIZES[modelName]['onnx/encoder_model_quantized.onnx'];
        expect(stats.size).toBeGreaterThanOrEqual(minSize);
      });
    });
  });

  describe('File integrity checks', () => {
    test('no file should be exactly 0 bytes (regression test)', () => {
      const modelsDir = path.join(process.cwd(), 'public', 'models', 'Xenova');
      
      MODELS.forEach(modelName => {
        REQUIRED_FILES.forEach(filename => {
          const filePath = path.join(modelsDir, modelName, filename);
          
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(0);
          }
        });
      });
    });

    test('all config.json files should be parseable', () => {
      const modelsDir = path.join(process.cwd(), 'public', 'models', 'Xenova');
      
      MODELS.forEach(modelName => {
        const configPath = path.join(modelsDir, modelName, 'config.json');
        
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf-8');
          
          // Should not throw
          expect(() => JSON.parse(content)).not.toThrow();
          
          // Should parse to an object with keys
          const config = JSON.parse(content);
          expect(Object.keys(config).length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Model accessibility via HTTP', () => {
    // This test assumes Next.js dev server is running
    // It's optional and can be skipped in CI if needed
    
    test.skip('models are accessible via localhost (requires dev server)', async () => {
      const http = require('http');
      
      for (const modelName of MODELS) {
        const url = `http://localhost:3000/models/Xenova/${modelName}/config.json`;
        
        const response = await new Promise((resolve, reject) => {
          http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          }).on('error', reject);
        });
        
        expect(response.status).toBe(200);
        expect(response.data.length).toBeGreaterThan(0);
        
        // Should be valid JSON
        expect(() => JSON.parse(response.data)).not.toThrow();
      }
    });
  });

  describe('Setup script validation', () => {
    test('setup-models.js script exists', () => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'setup-models.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('setup script defines all three models', () => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'setup-models.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      
      expect(scriptContent).toContain('whisper-tiny');
      expect(scriptContent).toContain('whisper-base');
      expect(scriptContent).toContain('whisper-small');
    });

    test('setup script checks for existing files', () => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'setup-models.js');
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      
      // Should have logic to skip already downloaded files
      expect(scriptContent).toMatch(/fs\.existsSync|file already exists/i);
    });
  });
});

describe('Model Selector Component Integration', () => {
  test('WHISPER_MODELS constant includes all three models', () => {
    const modelSelectorPath = path.join(process.cwd(), 'components', 'ModelSelector.tsx');
    const content = fs.readFileSync(modelSelectorPath, 'utf-8');
    
    expect(content).toContain('whisper-tiny');
    expect(content).toContain('whisper-base');
    expect(content).toContain('whisper-small');
  });

  test('Model IDs match HuggingFace format', () => {
    const modelSelectorPath = path.join(process.cwd(), 'components', 'ModelSelector.tsx');
    const content = fs.readFileSync(modelSelectorPath, 'utf-8');
    
    expect(content).toContain('Xenova/whisper-tiny');
    expect(content).toContain('Xenova/whisper-base');
    expect(content).toContain('Xenova/whisper-small');
  });
});

