# Test Fixtures

This directory contains test files for integration tests.

---

## 📁 Audio Test Files

For Whisper transcription integration tests, you can create test audio files here.

### **Creating Test Audio**

#### **Option 1: Generate Sine Wave (No Speech)**
```bash
# Creates a 2-second 1000Hz tone (16kHz, mono)
ffmpeg -f lavfi -i "sine=frequency=1000:duration=2" -ar 16000 -ac 1 test-tone.wav
```

#### **Option 2: Text-to-Speech Test (With Speech)**
If you have a TTS tool installed:
```bash
# macOS (built-in)
say "This is a test of the whisper transcription system" -o test-speech.aiff
ffmpeg -i test-speech.aiff -ar 16000 -ac 1 -acodec pcm_s16le test-speech.wav

# Windows (PowerShell with SAPI)
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.SetOutputToWaveFile("test-speech.wav")
$speak.Speak("This is a test of the whisper transcription system")
$speak.Dispose()
# Then convert to 16kHz:
ffmpeg -i test-speech.wav -ar 16000 -ac 1 test-speech-16k.wav
```

#### **Option 3: Record Your Own Voice**
```bash
# Record a short clip, then convert:
ffmpeg -i your-recording.mp3 -ar 16000 -ac 1 -acodec pcm_s16le test-voice.wav
```

---

## ⚙️ Audio Requirements

For Whisper model compatibility, test audio must be:
- **Sample Rate**: 16kHz (16000 Hz)
- **Channels**: Mono (1 channel)
- **Format**: WAV (PCM 16-bit little-endian)
- **Duration**: 1-10 seconds recommended for tests

---

## 📝 Suggested Test Files

Create these files for comprehensive testing:

1. **`test-tone.wav`** (2 seconds)
   - Pure sine wave
   - Tests audio processing pipeline
   - No speech, so transcription result will be empty or "[BLANK_AUDIO]"

2. **`test-speech-short.wav`** (2-5 seconds)
   - Simple phrase: "Hello world"
   - Tests basic transcription

3. **`test-speech-long.wav`** (10-30 seconds)
   - Longer sentence or paragraph
   - Tests chunking and timestamp generation

4. **`test-silence.wav`** (2 seconds)
   - Complete silence
   - Tests edge case handling

---

## 🧪 Using Test Files in Tests

```javascript
// Example integration test
const audioPath = path.join(__dirname, 'fixtures', 'test-speech.wav');
const audioBuffer = fs.readFileSync(audioPath);
const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

// Pass to transcriber...
```

---

## 🚫 .gitignore

Test audio files are **excluded from Git** to keep the repository lightweight.

```gitignore
__tests__/fixtures/*.wav
__tests__/fixtures/*.mp3
__tests__/fixtures/*.aiff
```

---

## 📊 Test File Sizes

Keep test files small for fast CI/CD:
- ✅ 2-second file @ 16kHz mono: ~64 KB
- ✅ 10-second file @ 16kHz mono: ~320 KB
- ❌ Avoid files >1MB in tests

---

## 🔗 Related Scripts

- **Setup Models**: `npm run setup-models`
- **Run Integration Tests**: `npm run test:integration`
- **Watch Mode**: `npm run test:watch -- --testPathPattern=integration`

---

**Note**: If you don't have test audio files, the integration tests will skip audio-dependent tests or use synthetic data.

