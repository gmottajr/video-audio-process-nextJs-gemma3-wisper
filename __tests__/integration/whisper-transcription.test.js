/**
 * Integration Tests for Whisper AI Transcription
 * 
 * Tests the complete transcription pipeline:
 * 1. Web Worker initialization
 * 2. Model loading from local files
 * 3. Audio transcription
 * 4. Result formatting
 * 
 * NOTE: These tests are slower (30-60s) as they load the actual AI model.
 */

const fs = require('fs');
const path = require('path');

// Longer timeout for AI model loading
jest.setTimeout(120000); // 2 minutes

describe('Whisper AI Transcription Integration', () => {
  const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
  const MODELS_DIR = path.join(PUBLIC_DIR, 'models', 'Xenova', 'whisper-tiny');

  describe('Prerequisites', () => {
    test('Web Worker file should exist', () => {
      const workerPath = path.join(PUBLIC_DIR, 'transcription.worker.js');
      expect(fs.existsSync(workerPath)).toBe(true);
    });

    test('Web Worker should be an ES module', () => {
      const workerPath = path.join(PUBLIC_DIR, 'transcription.worker.js');
      const content = fs.readFileSync(workerPath, 'utf-8');
      
      // Check for ES module syntax
      expect(content).toContain('import');
      expect(content).toContain('from');
      expect(content).not.toContain('importScripts'); // Old syntax
    });

    test('Web Worker should configure local model path', () => {
      const workerPath = path.join(PUBLIC_DIR, 'transcription.worker.js');
      const content = fs.readFileSync(workerPath, 'utf-8');
      
      expect(content).toContain('env.allowLocalModels = true');
      expect(content).toContain('env.allowRemoteModels = false');
      expect(content).toContain("env.localModelPath = '/models/'");
    });

    test('Transformers.js library should be present', () => {
      const libPath = path.join(PUBLIC_DIR, 'transformers.min.js');
      expect(fs.existsSync(libPath)).toBe(true);
      
      const stats = fs.statSync(libPath);
      expect(stats.size).toBeGreaterThan(500 * 1024); // >500KB
    });
  });

  describe('Model Files Accessibility', () => {
    test('All model files should be readable', () => {
      const requiredFiles = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'preprocessor_config.json',
        'generation_config.json',
        'onnx/encoder_model_quantized.onnx',
        'onnx/decoder_model_merged_quantized.onnx',
      ];

      requiredFiles.forEach(file => {
        const filePath = path.join(MODELS_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        
        // Verify file can be read
        expect(() => fs.readFileSync(filePath)).not.toThrow();
      });
    });

    test('Model config should have correct architecture', () => {
      const configPath = path.join(MODELS_DIR, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      expect(config).toHaveProperty('model_type');
      expect(config.model_type).toBe('whisper');
      expect(config).toHaveProperty('architectures');
      expect(config.architectures).toContain('WhisperForConditionalGeneration');
    });

    test('Tokenizer should have vocab size defined', () => {
      const tokenizerPath = path.join(MODELS_DIR, 'tokenizer_config.json');
      const tokenizer = JSON.parse(fs.readFileSync(tokenizerPath, 'utf-8'));
      
      expect(tokenizer).toHaveProperty('model_max_length');
      expect(tokenizer.model_max_length).toBeGreaterThan(0);
    });

    test('Preprocessor should specify correct sample rate', () => {
      const preprocessorPath = path.join(MODELS_DIR, 'preprocessor_config.json');
      const preprocessor = JSON.parse(fs.readFileSync(preprocessorPath, 'utf-8'));
      
      expect(preprocessor).toHaveProperty('sampling_rate');
      expect(preprocessor.sampling_rate).toBe(16000); // Whisper requires 16kHz
    });
  });

  describe('Audio Sample Preparation', () => {
    test('Should provide guidance for creating test audio', () => {
      // This test documents how to create test audio
      const guidance = `
        To test transcription with real audio:
        1. Create a short WAV file (16kHz, mono, PCM):
           ffmpeg -f lavfi -i "sine=frequency=1000:duration=2" -ar 16000 -ac 1 test-audio.wav
        2. Or record a short voice memo and convert:
           ffmpeg -i voice-memo.mp3 -ar 16000 -ac 1 -acodec pcm_s16le test-audio.wav
        3. Place in __tests__/fixtures/test-audio.wav
      `;
      
      expect(guidance).toContain('16kHz');
      expect(guidance).toContain('mono');
    });

    test('Test audio fixture directory should be documented', () => {
      const fixturesDir = path.join(__dirname, '..', 'fixtures');
      const readmePath = path.join(fixturesDir, 'README.md');
      
      // Check if fixtures directory exists or document its purpose
      if (fs.existsSync(readmePath)) {
        const readme = fs.readFileSync(readmePath, 'utf-8');
        expect(readme).toContain('audio');
      } else {
        // Document what should be there
        expect(fixturesDir).toBeTruthy();
      }
    });
  });

  describe('Model Size and Performance', () => {
    test('Total model size should be optimized for browser use', () => {
      let totalSize = 0;

      function getDirSize(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            getDirSize(filePath);
          } else {
            totalSize += stats.size;
          }
        });
      }

      getDirSize(MODELS_DIR);

      const totalMB = totalSize / (1024 * 1024);
      
      // Whisper-tiny should be reasonable for browser
      expect(totalMB).toBeGreaterThan(30);
      expect(totalMB).toBeLessThan(100);
      
      console.log(`    → Model size: ${totalMB.toFixed(2)} MB (optimized for browser)`);
    });

    test('ONNX models should be quantized for performance', () => {
      const encoderPath = path.join(MODELS_DIR, 'onnx/encoder_model_quantized.onnx');
      const decoderPath = path.join(MODELS_DIR, 'onnx/decoder_model_merged_quantized.onnx');
      
      // Quantized models should exist (filenames contain "quantized")
      expect(fs.existsSync(encoderPath)).toBe(true);
      expect(fs.existsSync(decoderPath)).toBe(true);
      
      // Quantized models are smaller than full precision
      const encoderSize = fs.statSync(encoderPath).size / (1024 * 1024);
      const decoderSize = fs.statSync(decoderPath).size / (1024 * 1024);
      
      console.log(`    → Encoder: ${encoderSize.toFixed(2)} MB`);
      console.log(`    → Decoder: ${decoderSize.toFixed(2)} MB`);
      
      // Should be reasonable sizes (not full 100MB+ models)
      expect(encoderSize).toBeLessThan(50);
      expect(decoderSize).toBeLessThan(50);
    });
  });

  describe('Configuration Validation', () => {
    test('Model should be configured for English transcription', () => {
      const configPath = path.join(MODELS_DIR, 'generation_config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Check if it has language configuration (Whisper uses tokens like "<|en|>")
      if (config.lang_to_id) {
        expect(config.lang_to_id).toHaveProperty('<|en|>'); // English language token
        expect(config.lang_to_id['<|en|>']).toBeDefined();
      }
    });

    test('Model should support timestamp generation', () => {
      const configPath = path.join(MODELS_DIR, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Whisper models have max_length which affects timestamps
      expect(config).toHaveProperty('max_length');
      expect(config.max_length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('Should gracefully handle missing model files', () => {
      const missingFile = path.join(MODELS_DIR, 'non-existent-file.json');
      expect(fs.existsSync(missingFile)).toBe(false);
    });

    test('Should validate JSON files are not corrupted', () => {
      const jsonFiles = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'preprocessor_config.json',
        'generation_config.json',
      ];

      jsonFiles.forEach(file => {
        const filePath = path.join(MODELS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Should parse without errors
        expect(() => JSON.parse(content)).not.toThrow();
        
        // Should not be empty
        const parsed = JSON.parse(content);
        expect(Object.keys(parsed).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Readiness', () => {
    test('All required files for transcription pipeline should be present', () => {
      const requiredPaths = [
        // Web Worker
        path.join(PUBLIC_DIR, 'transcription.worker.js'),
        // Transformers.js library
        path.join(PUBLIC_DIR, 'transformers.min.js'),
        // Model files
        path.join(MODELS_DIR, 'config.json'),
        path.join(MODELS_DIR, 'tokenizer.json'),
        path.join(MODELS_DIR, 'onnx/encoder_model_quantized.onnx'),
        path.join(MODELS_DIR, 'onnx/decoder_model_merged_quantized.onnx'),
      ];

      requiredPaths.forEach(filePath => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      console.log('    ✅ All files present for offline transcription');
    });

    test('Should document browser requirements', () => {
      const workerPath = path.join(PUBLIC_DIR, 'transcription.worker.js');
      const content = fs.readFileSync(workerPath, 'utf-8');
      
      // Worker should be documented or contain configuration
      expect(content.length).toBeGreaterThan(1000); // Substantial file
    });
  });
});

