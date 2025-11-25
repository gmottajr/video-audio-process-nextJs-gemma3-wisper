# 🧪 Test Suite

This directory contains unit tests to verify the project's setup scripts and overall integrity.

---

## 📁 Test Files

### **1. setup-ffmpeg.test.js**
Tests for the FFmpeg setup script (`scripts/setup-ffmpeg.js`)

**What it verifies:**
- ✅ `public/ffmpeg/` directory exists
- ✅ `ffmpeg-core.js` is present and valid
- ✅ `ffmpeg-core.wasm` is present and valid
- ✅ Files have correct sizes (>100KB for JS, >1MB for WASM)
- ✅ Files are readable

**Critical for:** Ensuring FFmpeg.wasm can load correctly in the browser.

---

### **2. setup-models.test.js**
Tests for the AI model setup script (`scripts/setup-models.js`)

**What it verifies:**
- ✅ `public/transformers.min.js` is copied correctly
- ✅ `public/models/Xenova/whisper-tiny/` directory structure
- ✅ All configuration files exist (config.json, tokenizer.json, etc.)
- ✅ ONNX model files are present (encoder, decoder)
- ✅ Files are valid JSON where expected
- ✅ Model files have reasonable sizes (30-50MB total)
- ✅ All files are readable

**Critical for:** Ensuring AI transcription works offline without CDN dependencies.

---

### **3. project-integrity.test.js**
End-to-end integrity tests for the entire project

**What it verifies:**
- ✅ All critical directories exist (app, components, hooks, utils, etc.)
- ✅ All critical files are in place
- ✅ `next.config.mjs` has COOP/COEP headers
- ✅ `.gitignore` excludes large binary files
- ✅ `package.json` has correct scripts and dependencies
- ✅ All hooks exist (`useFFmpeg`, `useTranscriber`, etc.)
- ✅ All components exist (`FileUploader`, `ActionSelector`, etc.)
- ✅ All utility files exist (`audioFormats`, `videoFormats`, etc.)

**Critical for:** Ensuring the entire application architecture is intact.

---

## 🚀 Running Tests

### **Run All Tests**
```bash
npm test
```

### **Run Specific Test Suite**
```bash
# FFmpeg setup only
npm run test:setup

# Project integrity only
npm run test:integrity
```

### **Watch Mode** (re-runs on file changes)
```bash
npm run test:watch
```

### **Coverage Report**
```bash
npm run test:coverage
```

---

## 📊 Expected Output

### **All Tests Passing** ✅
```
PASS  __tests__/setup-ffmpeg.test.js
  FFmpeg Setup
    Directory Structure
      ✓ public/ffmpeg/ directory should exist
      ✓ public/ffmpeg/ should be a directory
    Required Files
      ✓ ffmpeg-core.js should exist in public/ffmpeg/
      ✓ ffmpeg-core.wasm should exist in public/ffmpeg/
      ✓ ffmpeg-core.js should not be empty
      ✓ ffmpeg-core.wasm should not be empty
    File Sizes
      ✓ ffmpeg-core.js should be substantial (>100KB)
      ✓ ffmpeg-core.wasm should be substantial (>1MB)
    File Permissions
      ✓ ffmpeg-core.js should be readable
      ✓ ffmpeg-core.wasm should be readable

PASS  __tests__/setup-models.test.js
  AI Model Setup
    Transformers.js Library
      ✓ transformers.min.js should exist in public/
      ✓ transformers.min.js should be a file
      ✓ transformers.min.js should be substantial (>500KB)
      ✓ transformers.min.js should be readable
    Model Directory Structure
      ✓ public/models/ directory should exist
      ✓ public/models/Xenova/ directory should exist
      ✓ public/models/Xenova/whisper-tiny/ directory should exist
      ✓ public/models/Xenova/whisper-tiny/ should be a directory
    Model Configuration Files
      ✓ config.json should exist
      ✓ tokenizer.json should exist
      ✓ preprocessor_config.json should exist
      ✓ generation_config.json should exist
      ✓ config.json should be valid JSON
      ...
    ONNX Model Files
      ✓ onnx/ subdirectory should exist
      ✓ encoder_model_quantized.onnx should exist in onnx/ subdirectory
      ✓ decoder_model_merged_quantized.onnx should exist in onnx/ subdirectory
      ✓ encoder_model_quantized.onnx should be substantial (>10MB)
      ✓ decoder_model_merged_quantized.onnx should be substantial (>10MB)
    Total Model Size
      ✓ Total model size should be reasonable (30-50MB)
    File Integrity
      ✓ All model files should be readable

PASS  __tests__/project-integrity.test.js
  Project Integrity
    Critical Directories
      ✓ public directory should exist
      ✓ public/ffmpeg directory should exist
      ✓ public/models directory should exist
      ✓ app directory should exist
      ✓ components directory should exist
      ✓ hooks directory should exist
      ✓ utils directory should exist
      ✓ scripts directory should exist
    Critical Files
      ✓ package.json should exist
      ✓ next.config.mjs should exist
      ✓ README.md should exist
      ✓ public/transcription.worker.js should exist
      ...

Test Suites: 3 passed, 3 total
Tests:       XX passed, XX total
Time:        X.XXs
```

---

## 🐛 Common Issues

### **Tests Fail After Fresh Clone**
**Problem:** Setup scripts haven't run yet.

**Solution:**
```bash
npm install  # Runs postinstall automatically
# OR manually:
npm run setup-ffmpeg
npm run setup-models
npm test
```

---

### **Model Files Not Found**
**Problem:** `setup-models.js` failed to download files.

**Solution:**
```bash
# Re-run model setup
npm run setup-models

# Then test
npm run test:setup
```

---

### **WASM File Size Too Small**
**Problem:** Incomplete download or corrupted file.

**Solution:**
```bash
# Re-run FFmpeg setup
npm run setup-ffmpeg

# Verify manually
ls -lh public/ffmpeg/
```

---

## 📋 Test Coverage

These tests cover:
- ✅ **Setup Scripts**: FFmpeg and AI model installation
- ✅ **File System**: Directory structure and file presence
- ✅ **File Sizes**: Ensuring downloads completed successfully
- ✅ **JSON Validity**: Configuration files are parseable
- ✅ **Permissions**: All files are readable
- ✅ **Configuration**: Next.js headers, gitignore, package.json

**Not covered** (would require different testing approach):
- ❌ Runtime FFmpeg functionality (requires browser environment)
- ❌ AI model inference (requires WASM/WebGPU)
- ❌ React component rendering (would need React Testing Library)
- ❌ UI interactions (would need Playwright/Cypress)

---

## 🎯 When to Run Tests

### **During Development**
```bash
npm run test:watch  # Auto-runs on file changes
```

### **Before Committing**
```bash
npm test  # Verify everything is in place
```

### **After Fresh Clone**
```bash
npm install  # Sets up everything
npm test     # Verifies setup succeeded
```

### **In CI/CD Pipeline**
```bash
npm install
npm test
npm run build  # Only if tests pass
```

---

## 📝 Adding New Tests

### **File Naming Convention**
- Test files: `*.test.js`
- Located in: `__tests__/` directory

### **Example Test Template**
```javascript
describe('Feature Name', () => {
  describe('Subcategory', () => {
    test('should do something specific', () => {
      // Arrange
      const expected = 'value';
      
      // Act
      const actual = someFunction();
      
      // Assert
      expect(actual).toBe(expected);
    });
  });
});
```

---

## 🔗 Related Documentation

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Setup Scripts**: `scripts/setup-ffmpeg.js`, `scripts/setup-models.js`
- **Main README**: `../README.md`

---

**These tests ensure the "Performance-First" architecture remains intact! 🚀**

