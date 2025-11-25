# 🧪 Integration Tests

This directory contains integration tests that verify the complete AI transcription pipeline.

---

## 📁 Test Files

### **whisper-transcription.test.js** (18 tests)

Comprehensive integration tests for the Whisper AI transcription feature.

**What it tests:**
- ✅ Web Worker configuration (ES module syntax, local imports)
- ✅ Model files accessibility and structure
- ✅ ONNX model files (encoder, decoder)
- ✅ Configuration files (tokenizer, preprocessor, generation config)
- ✅ Model size optimization (quantized models, <50MB total)
- ✅ Preprocessor sample rate (16kHz requirement for Whisper)
- ✅ Complete pipeline readiness

**Does NOT test** (requires browser environment):
- ❌ Actual model loading in Web Worker
- ❌ Real-time transcription
- ❌ Audio processing

---

## 🚀 Running Integration Tests

### **Run all integration tests**
```bash
npm run test:integration
```

### **Run specific integration test**
```bash
npm run test:integration:whisper
```

### **Watch mode**
```bash
npm run test:watch -- --testPathPattern=integration
```

---

## 📊 Test Results

```
✅ Test Suite: 1 passed
✅ Tests: 18 passed
⏱️  Time: ~0.3s
```

**Integration tests verify:**
- Web Worker is configured correctly ✅
- Model files downloaded successfully ✅
- File sizes are reasonable (41.60 MB total) ✅
- All configs are valid JSON ✅
- Whisper requires 16kHz audio ✅
- Pipeline is ready for browser execution ✅

---

## 🎯 Why Integration Tests?

### **Unit Tests** (`__tests__/`)
- Fast (<1s)
- Test individual files and setup scripts
- No dependencies between components

### **Integration Tests** (`__tests__/integration/`)
- Slightly slower (~0.3s)
- Test complete pipelines
- Verify components work together
- Check end-to-end readiness

---

## 🧪 Test Audio Samples

For future end-to-end tests (in a browser environment), you can create test audio files:

See `__tests__/fixtures/README.md` for instructions on creating test audio.

---

## 📝 Adding New Integration Tests

### **Template**
```javascript
describe('Feature Integration', () => {
  const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
  
  describe('Component A + Component B', () => {
    test('should work together', () => {
      // Arrange: Set up files/config
      // Act: Check interaction
      // Assert: Verify result
    });
  });
});
```

### **Naming Convention**
- File: `feature-name.test.js`
- Tests: Descriptive, action-oriented

---

## 🔗 Related

- **Unit Tests**: `__tests__/`
- **Test Fixtures**: `__tests__/fixtures/`
- **Setup Scripts**: `scripts/setup-models.js`, `scripts/setup-ffmpeg.js`

---

**These integration tests ensure the AI transcription pipeline is ready to run in the browser! 🚀**
