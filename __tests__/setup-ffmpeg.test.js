/**
 * Tests for FFmpeg Setup Script
 * 
 * Verifies that setup-ffmpeg.js correctly places FFmpeg core files
 * in the public/ffmpeg/ directory.
 */

const fs = require('fs');
const path = require('path');

describe('FFmpeg Setup', () => {
  const FFMPEG_DIR = path.join(__dirname, '..', 'public', 'ffmpeg');
  const REQUIRED_FILES = [
    'ffmpeg-core.js',
    'ffmpeg-core.wasm',
  ];

  describe('Directory Structure', () => {
    test('public/ffmpeg/ directory should exist', () => {
      expect(fs.existsSync(FFMPEG_DIR)).toBe(true);
    });

    test('public/ffmpeg/ should be a directory', () => {
      const stats = fs.statSync(FFMPEG_DIR);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Required Files', () => {
    test.each(REQUIRED_FILES)(
      '%s should exist in public/ffmpeg/',
      (filename) => {
        const filePath = path.join(FFMPEG_DIR, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    );

    test.each(REQUIRED_FILES)(
      '%s should not be empty',
      (filename) => {
        const filePath = path.join(FFMPEG_DIR, filename);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    );
  });

  describe('File Sizes', () => {
    test('ffmpeg-core.js should be substantial (>100KB)', () => {
      const filePath = path.join(FFMPEG_DIR, 'ffmpeg-core.js');
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(100 * 1024); // >100KB
    });

    test('ffmpeg-core.wasm should be substantial (>1MB)', () => {
      const filePath = path.join(FFMPEG_DIR, 'ffmpeg-core.wasm');
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1024 * 1024); // >1MB
    });
  });

  describe('File Permissions', () => {
    test.each(REQUIRED_FILES)(
      '%s should be readable',
      (filename) => {
        const filePath = path.join(FFMPEG_DIR, filename);
        expect(() => fs.accessSync(filePath, fs.constants.R_OK)).not.toThrow();
      }
    );
  });
});

