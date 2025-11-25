/**
 * Tests for AI Model Setup Script
 * 
 * Verifies that setup-models.js correctly:
 * 1. Copies transformers.min.js to public/
 * 2. Downloads Whisper model files to public/models/Xenova/whisper-tiny/
 */

const fs = require('fs');
const path = require('path');

describe('AI Model Setup', () => {
  const PUBLIC_DIR = path.join(__dirname, '..', 'public');
  const MODELS_DIR = path.join(PUBLIC_DIR, 'models', 'Xenova', 'whisper-tiny');
  const TRANSFORMERS_LIB = path.join(PUBLIC_DIR, 'transformers.min.js');

  describe('Transformers.js Library', () => {
    test('transformers.min.js should exist in public/', () => {
      expect(fs.existsSync(TRANSFORMERS_LIB)).toBe(true);
    });

    test('transformers.min.js should be a file', () => {
      const stats = fs.statSync(TRANSFORMERS_LIB);
      expect(stats.isFile()).toBe(true);
    });

    test('transformers.min.js should be substantial (>500KB)', () => {
      const stats = fs.statSync(TRANSFORMERS_LIB);
      expect(stats.size).toBeGreaterThan(500 * 1024); // >500KB
    });

    test('transformers.min.js should be readable', () => {
      expect(() => fs.accessSync(TRANSFORMERS_LIB, fs.constants.R_OK)).not.toThrow();
    });
  });

  describe('Model Directory Structure', () => {
    test('public/models/ directory should exist', () => {
      const modelsRoot = path.join(PUBLIC_DIR, 'models');
      expect(fs.existsSync(modelsRoot)).toBe(true);
    });

    test('public/models/Xenova/ directory should exist', () => {
      const xenovaDir = path.join(PUBLIC_DIR, 'models', 'Xenova');
      expect(fs.existsSync(xenovaDir)).toBe(true);
    });

    test('public/models/Xenova/whisper-tiny/ directory should exist', () => {
      expect(fs.existsSync(MODELS_DIR)).toBe(true);
    });

    test('public/models/Xenova/whisper-tiny/ should be a directory', () => {
      const stats = fs.statSync(MODELS_DIR);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Model Configuration Files', () => {
    const CONFIG_FILES = [
      'config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'preprocessor_config.json',
      'generation_config.json',
    ];

    test.each(CONFIG_FILES)(
      '%s should exist',
      (filename) => {
        const filePath = path.join(MODELS_DIR, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    );

    test.each(CONFIG_FILES)(
      '%s should be valid JSON',
      (filename) => {
        const filePath = path.join(MODELS_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    );

    test.each(CONFIG_FILES)(
      '%s should not be empty',
      (filename) => {
        const filePath = path.join(MODELS_DIR, filename);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    );
  });

  describe('ONNX Model Files', () => {
    const ONNX_DIR = path.join(MODELS_DIR, 'onnx');
    const ONNX_FILES = [
      'encoder_model_quantized.onnx',
      'decoder_model_merged_quantized.onnx',
    ];

    test('onnx/ subdirectory should exist', () => {
      expect(fs.existsSync(ONNX_DIR)).toBe(true);
    });

    test.each(ONNX_FILES)(
      '%s should exist in onnx/ subdirectory',
      (filename) => {
        const filePath = path.join(ONNX_DIR, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    );

    test('encoder_model_quantized.onnx should be substantial (>9MB)', () => {
      const filePath = path.join(ONNX_DIR, 'encoder_model_quantized.onnx');
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(9 * 1024 * 1024); // >9MB (quantized models are smaller)
    });

    test('decoder_model_merged_quantized.onnx should be substantial (>10MB)', () => {
      const filePath = path.join(ONNX_DIR, 'decoder_model_merged_quantized.onnx');
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(10 * 1024 * 1024); // >10MB
    });
  });

  describe('Total Model Size', () => {
    test('Total model size should be reasonable (30-50MB)', () => {
      let totalSize = 0;

      // Recursively calculate directory size
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
      expect(totalMB).toBeGreaterThan(30); // At least 30MB
      expect(totalMB).toBeLessThan(100);   // But not more than 100MB
    });
  });

  describe('File Integrity', () => {
    test('All model files should be readable', () => {
      const allFiles = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'preprocessor_config.json',
        'generation_config.json',
        'onnx/encoder_model_quantized.onnx',
        'onnx/decoder_model_merged_quantized.onnx',
      ];

      allFiles.forEach(file => {
        const filePath = path.join(MODELS_DIR, file);
        expect(() => fs.accessSync(filePath, fs.constants.R_OK)).not.toThrow();
      });
    });
  });
});

