/**
 * Project Integrity Tests
 * 
 * Verifies the overall project structure and that all critical files
 * are in place for the application to run correctly.
 */

const fs = require('fs');
const path = require('path');

describe('Project Integrity', () => {
  const ROOT_DIR = path.join(__dirname, '..');

  describe('Critical Directories', () => {
    const REQUIRED_DIRS = [
      'public',
      'public/ffmpeg',
      'public/models',
      'public/models/Xenova',
      'public/models/Xenova/whisper-tiny',
      'public/models/Xenova/whisper-tiny/onnx',
      'app',
      'components',
      'hooks',
      'utils',
      'scripts',
    ];

    test.each(REQUIRED_DIRS)(
      '%s directory should exist',
      (dir) => {
        const dirPath = path.join(ROOT_DIR, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      }
    );
  });

  describe('Critical Files', () => {
    const REQUIRED_FILES = [
      'package.json',
      'next.config.mjs',
      'tailwind.config.ts',
      'tsconfig.json',
      '.gitignore',
      'README.md',
      'scripts/setup-ffmpeg.js',
      'scripts/setup-models.js',
      'public/transcription.worker.js',
      'public/transformers.min.js',
    ];

    test.each(REQUIRED_FILES)(
      '%s should exist',
      (file) => {
        const filePath = path.join(ROOT_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    );
  });

  describe('Next.js Configuration', () => {
    test('next.config.mjs should configure COOP/COEP headers', () => {
      const configPath = path.join(ROOT_DIR, 'next.config.mjs');
      const content = fs.readFileSync(configPath, 'utf-8');
      
      expect(content).toContain('Cross-Origin-Embedder-Policy');
      expect(content).toContain('Cross-Origin-Opener-Policy');
      expect(content).toContain('require-corp');
      expect(content).toContain('same-origin');
    });
  });

  describe('.gitignore Configuration', () => {
    test('.gitignore should exclude large binary files', () => {
      const gitignorePath = path.join(ROOT_DIR, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      
      expect(content).toContain('/public/ffmpeg/');
      expect(content).toContain('/public/models/');
      expect(content).toContain('/public/transformers.min.js');
    });

    test('.gitignore should exclude media files', () => {
      const gitignorePath = path.join(ROOT_DIR, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      
      expect(content).toMatch(/\*\.mp4/);
      expect(content).toMatch(/\*\.wav/);
      expect(content).toMatch(/\*\.mp3/);
    });
  });

  describe('Package.json Scripts', () => {
    test('package.json should have setup scripts', () => {
      const packagePath = path.join(ROOT_DIR, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      expect(packageJson.scripts).toHaveProperty('setup-ffmpeg');
      expect(packageJson.scripts).toHaveProperty('setup-models');
      expect(packageJson.scripts).toHaveProperty('postinstall');
    });

    test('postinstall should run setup scripts', () => {
      const packagePath = path.join(ROOT_DIR, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      const postinstall = packageJson.scripts.postinstall;
      expect(postinstall).toContain('setup-ffmpeg');
      expect(postinstall).toContain('setup-models');
    });

    test('package.json should have required dependencies', () => {
      const packagePath = path.join(ROOT_DIR, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      
      expect(packageJson.dependencies).toHaveProperty('@ffmpeg/ffmpeg');
      expect(packageJson.dependencies).toHaveProperty('@ffmpeg/util');
      expect(packageJson.dependencies).toHaveProperty('@ffmpeg/core');
      expect(packageJson.dependencies).toHaveProperty('@xenova/transformers');
      expect(packageJson.dependencies['wavesurfer.js']).toBeDefined();
    });
  });

  describe('Application Entry Points', () => {
    test('app/page.tsx should exist', () => {
      const pagePath = path.join(ROOT_DIR, 'app', 'page.tsx');
      expect(fs.existsSync(pagePath)).toBe(true);
    });

    test('app/layout.tsx should exist', () => {
      const layoutPath = path.join(ROOT_DIR, 'app', 'layout.tsx');
      expect(fs.existsSync(layoutPath)).toBe(true);
    });
  });

  describe('Core Hooks', () => {
    const REQUIRED_HOOKS = [
      'hooks/useFFmpeg.ts',
      'hooks/useAudioConverter.ts',
      'hooks/useVideoConverter.ts',
      'hooks/useTranscriber.ts',
      'hooks/useResourceMonitor.ts',
    ];

    test.each(REQUIRED_HOOKS)(
      '%s should exist',
      (hook) => {
        const hookPath = path.join(ROOT_DIR, hook);
        expect(fs.existsSync(hookPath)).toBe(true);
      }
    );
  });

  describe('Core Components', () => {
    const REQUIRED_COMPONENTS = [
      'components/FileUploader.tsx',
      'components/ActionSelector.tsx',
      'components/MetadataDisplay.tsx',
      'components/ResourceMonitor.tsx',
      'components/WaveformViewer.tsx',
      'components/ProcessingVisualizer.tsx',
      'components/TranscriptionViewer.tsx',
    ];

    test.each(REQUIRED_COMPONENTS)(
      '%s should exist',
      (component) => {
        const componentPath = path.join(ROOT_DIR, component);
        expect(fs.existsSync(componentPath)).toBe(true);
      }
    );
  });

  describe('Utility Files', () => {
    const REQUIRED_UTILS = [
      'utils/audioFormats.ts',
      'utils/videoFormats.ts',
      'utils/cn.ts',
    ];

    test.each(REQUIRED_UTILS)(
      '%s should exist',
      (util) => {
        const utilPath = path.join(ROOT_DIR, util);
        expect(fs.existsSync(utilPath)).toBe(true);
      }
    );
  });
});

