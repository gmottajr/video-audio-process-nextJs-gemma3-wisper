# 🎵 Neural Groove Spectrum Divergent

## Professional Video & Audio Processing with AI Transcription

A powerful browser-based application for video/audio processing and AI-powered transcription using **FFmpeg WebAssembly** and **Whisper AI**.

---

## ✨ Features

### 🎬 Video Processing
- **Extract Audio** from video files (MP4, AVI, MOV, MKV, WebM)
- **Convert Video** containers with optional resolution changes
- **Smart Remuxing** for instant conversions when possible
- **Multiple output formats** supported

### 🎵 Audio Processing
- **Convert Audio** formats (WAV, MP3, AAC, OGG, FLAC, etc.)
- **Professional Compression**:
  - 🎙️ **Speech Compression** (dynaudnorm) - Perfect for meetings, interviews, conversations
  - 🎚️ **Studio Compression** (acompressor) - Ideal for podcasts, broadcasts, professional content
  - 🎛️ **Both Compressions** - Maximum enhancement for difficult audio
- **Audio Normalization** (EBU R128 loudnorm) - Consistent volume levels
- **Smart Recommendations** based on filename patterns
- **Combinable Effects** - Apply compression + normalization together

### 🤖 AI Transcription
- **Whisper AI Models** (tiny, base, small, medium, large, turbo)
- **Browser-Based** - No data sent to servers, complete privacy
- **Word-Level Timestamps** for precise transcription
- **Multiple Export Formats** (TXT, JSON, SRT subtitles)
- **Enhance Before Transcription**:
  - Apply compression/normalization to audio before transcription
  - Improves accuracy for difficult audio (quiet recordings, multi-speaker, etc.)
  - Smart recommendations guide you to the best settings
- **Transcribe from Results** - Transcribe audio directly from extraction/conversion results

### ⚡ Performance & Safety
- **Resource Warnings** - Smart estimation of RAM, GPU, and CPU requirements
  - Based on real-world data: 400MB video + Small model = ~76GB RAM
  - Warns before attempting dangerous configurations
  - Prevents system crashes
- **Processing Time Estimates** - Know how long processing will take
- **Real-time Progress** tracking with speed indicators
- **Memory Monitoring** - Track RAM usage during processing
- **Waveform Visualization** for audio preview

### 🎨 User Experience
- **Clean, Modern UI** with gradient animations
- **Breadcrumb Navigation** - Always know where you are
- **Compact Transcribe Mode** - Streamlined UI for transcription
- **State Machine Architecture** - Predictable, bug-free workflow
- **Smart File Detection** - Automatic format recognition
- **Font Customization** - Choose your preferred font style

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Modern web browser** (Chrome, Edge, or Firefox recommended)
- **Sufficient RAM** for transcription (see Resource Requirements)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd video-audio-process-nextJs-gemma3-wisper

# Install dependencies
npm install

# Download Whisper AI models (required for transcription)
npm run download-models

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage Guide

### Extract Audio from Video

1. **Upload** a video file (MP4, MOV, AVI, etc.)
2. Select **"Extract Audio"** mode
3. Choose your **audio format** (WAV, MP3, etc.)
4. **Optional Enhancements**:
   - Select **compression type** (Speech, Studio, Both, or None)
   - Enable **normalization** for consistent volume
   - See **smart recommendations** based on your file
5. Click **"Extract Audio"** (or "Extract & Enhance Audio")
6. **Download** or **transcribe** the result

### Convert Audio Format

1. **Upload** an audio file
2. Select your **target format**
3. **Optional Enhancements**:
   - Apply **compression** for better quality
   - Enable **normalization**
4. Click **"Convert to [Format]"**
5. **Download** the result

### AI Transcription

#### From Video/Audio File:
1. **Upload** your media file
2. Select **"Transcribe"** mode
3. Choose your **AI model**:
   - **Tiny/Base**: Fast, good for clear audio
   - **Small**: Balanced accuracy and speed (recommended)
   - **Medium/Large**: Best accuracy, requires more RAM
4. **Optional Audio Enhancement**:
   - Select **compression** (Speech recommended for meetings)
   - Enable **normalization**
   - See **resource warnings** for large files
5. Click **"Start AI Transcription"**
6. Wait for processing (check RAM warning if shown)
7. **Export** as TXT, JSON, or SRT

#### From Extraction Results:
1. After extracting/converting audio, scroll down
2. See **"Transcribe This Audio"** section
3. Choose **optional enhancements** (if not already applied)
4. Click **"Transcribe to Text"**
5. Audio is enhanced (if needed) then transcribed

---

## 🎚️ Audio Enhancement Guide

### When to Use Each Compression Type

#### 🎙️ Speech Compression (dynaudnorm)
**Best for:**
- Meetings and conference calls
- Interviews
- Conversations with multiple speakers
- Recordings with varying distances from microphone

**Effect:** Dynamically balances different speaker volumes using frame-based analysis

**Processing Time:** +15%

#### 🎚️ Studio Compression (acompressor)
**Best for:**
- Podcasts
- Broadcasts
- Professional voiceovers
- Music production

**Effect:** Professional smooth compression using traditional threshold/ratio methods

**Processing Time:** +12%

#### 🎛️ Both Compressions (Experimental)
**Best for:**
- Extremely difficult audio
- Maximum dynamic range control
- Experimental sound design

**Warning:** May over-compress audio, test with your content

**Processing Time:** +25%

#### 🎵 Normalization (loudnorm)
**Best for:**
- Quiet recordings
- Inconsistent volume levels
- Preparing audio for transcription

**Effect:** Normalizes loudness to EBU R128 standard (-16 LUFS)

**Processing Time:** +10%

### Recommended Combinations

| Use Case | Recommended Settings |
|----------|---------------------|
| Meeting Transcription | 🎙️ Speech + ☑️ Normalize |
| Podcast Transcription | 🎚️ Studio |
| Interview Transcription | 🎙️ Speech + ☑️ Normalize |
| Broadcast Audio | 🎚️ Studio + ☑️ Normalize |
| Difficult/Quiet Audio | 🎛️ Both + ☑️ Normalize |
| High-Quality Studio Recording | ⭕ No Compression |

---

## ⚠️ Resource Requirements

### Transcription RAM Usage (Real-World Data)

| File Size | Tiny Model | Base Model | Small Model | Medium Model | Large Model |
|-----------|------------|------------|-------------|--------------|-------------|
| 50 MB | ~5 GB | ~7 GB | ~9 GB | ~23 GB | ~46 GB |
| 100 MB | ~9 GB | ~14 GB | ~19 GB | ~46 GB | ~93 GB |
| 250 MB | ~23 GB | ~35 GB | ~47 GB | ~116 GB | ~232 GB |
| **400 MB** | ~37 GB | ~56 GB | **~76 GB** | ~185 GB | ~370 GB |
| 500 MB | ~46 GB | ~70 GB | ~95 GB | ~232 GB | ~464 GB |

### Warning Levels

- ✅ **Low** (< 20GB): Safe, should process smoothly
- ⚡ **Medium** (20-50GB): Moderate load, close other applications
- 🟠 **High** (50-100GB): High resource usage, ensure sufficient RAM
- 🔴 **Extreme** (100GB+): May crash your system, use smaller file or lighter model

### Recommendations

**For Large Files (> 250MB):**
- Use **Tiny** or **Base** models for safety
- Or split the file into smaller chunks
- Ensure no other applications are running

**For Best Accuracy:**
- Use **Small** model (good balance)
- Files under 100MB are safe with any model

**GPU & CPU:**
- GPU recommended for Medium/Large models with files > 100MB
- High-end CPU (8+ cores) recommended for files > 250MB

---

## 🏗️ Architecture

### Tech Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety throughout
- **FFmpeg.wasm** - Video/audio processing in browser
- **Transformers.js** - Whisper AI for transcription
- **Tailwind CSS** - Modern styling
- **Web Workers** - Background processing

### Key Components
- **State Machine** (`useAppStateMachine`) - Predictable state management
- **Media Processor** (`useMediaProcessor`) - Orchestrates all processing
- **Audio Converter** (`useAudioConverter`) - Handles compression & normalization
- **FFmpeg Integration** (`useFFmpeg`) - Browser-based media processing
- **Transcriber** (`useTranscriber`) - AI transcription with Whisper

### Processing Pipeline

```
1. Upload File
   ↓
2. File Inspection (metadata extraction)
   ↓
3. User Selection (format, compression, normalization, model)
   ↓
4. Processing:
   - FFmpeg operations (extract/convert)
   - Apply compression filters (if selected)
   - Apply normalization (if selected)
   - Whisper AI transcription (if selected)
   ↓
5. Result Display
   - Waveform visualization
   - Download options
   - Transcribe option (if audio)
   - Transcription viewer (if transcribed)
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- audioCompression
```

### Test Coverage

- **Total Tests:** 71+ tests
- **Unit Tests:** 43+ tests (compression, helpers, utilities)
- **Integration Tests:** 28+ tests (end-to-end workflows)
- **Coverage:** >95%

---

## 📝 Development

### Project Structure

```
├── app/                      # Next.js app directory
│   ├── page.tsx             # Main application (refactored)
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── states/             # State-specific views
│   ├── ActionSelector.tsx  # Format & compression selection
│   ├── WaveformViewer.tsx  # Audio visualization
│   ├── TranscriptionViewer.tsx
│   └── ResourceWarning.tsx # RAM/GPU warnings
├── hooks/                   # Custom React hooks
│   ├── useAppStateMachine.ts
│   ├── useMediaProcessor.ts
│   ├── useAudioConverter.ts
│   ├── useFFmpeg.ts
│   └── useTranscriber.ts
├── contexts/               # React contexts
│   ├── FontContext.tsx
│   └── TranscriberContext.tsx
├── utils/                  # Utility functions
│   ├── audioFormats.ts
│   ├── videoFormats.ts
│   ├── resourceEstimation.ts
│   └── compressionHelpers.ts
└── __tests__/              # Test files
    ├── unit/
    └── integration/
```

### Key Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode

# Whisper Models
npm run download-models # Download AI models
npm run validate-models # Verify models exist

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript check
```

---

## 🎯 Features in Detail

### Audio Compression

Professional-grade audio compression using FFmpeg filters:

**Speech Compression (dynaudnorm):**
```
Filter: dynaudnorm=f=200:g=15:p=0.9:m=15:s=15
- Frame length: 200ms (speech rhythm)
- Gaussian window: 15 (smooth transitions)
- Target peak: 90% (prevent clipping)
- Max gain: 15x (boost quiet voices)
- Min gain: 1/15x (reduce loud voices)
```

**Studio Compression (acompressor):**
```
Filter: acompressor=threshold=-20dB:ratio=4:attack=20:release=250
- Threshold: -20dB (compress above this level)
- Ratio: 4:1 (standard for voice)
- Attack: 20ms (fast response)
- Release: 250ms (natural sound)
```

**Filter Chain Order:**
1. Compression filters (if selected)
2. Normalization filter (if selected)
3. Format conversion

### Transcription Enhancement

Audio can be enhanced before transcription for better accuracy:

1. **Automatic 16kHz Mono Conversion** - Whisper requirement
2. **Optional Compression** - Balance speaker volumes
3. **Optional Normalization** - Consistent loudness
4. **Whisper AI Processing** - Generate transcription

**Best Practices:**
- Use **Speech Compression + Normalization** for meetings
- Use **Studio Compression** for podcasts
- Use **Normalization only** for already-compressed audio
- Use **No Enhancement** for high-quality studio recordings

---

## 🐛 Troubleshooting

### "Out of Memory" Error

**Cause:** File too large or model too complex for available RAM

**Solutions:**
- Use a **smaller model** (Tiny or Base)
- Use a **smaller file** (< 100MB recommended)
- **Close other applications** to free RAM
- **Split large files** into smaller chunks

### Transcription is Very Slow

**Normal:** Large files with complex models take time
- 100MB + Small model: ~10-15 minutes
- 400MB + Small model: ~40+ minutes

**Solutions:**
- Use **Tiny or Base** models for faster processing
- Use **smaller files** when possible
- Ensure **no other heavy applications** running

### Browser Freezes During Processing

**Cause:** System running out of resources

**Prevention:**
- Check **resource warnings** before starting
- Use **lighter models** for large files
- **Close other browser tabs**
- Ensure **sufficient system RAM**

### Audio Quality Issues

**Problem:** Over-compressed or distorted audio

**Solutions:**
- Try **different compression types**
- Use **No Compression** for high-quality sources
- Avoid **Both Compressions** unless necessary
- Use **Normalization only** for consistent volume

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **FFmpeg.wasm** - Browser-based media processing
- **Transformers.js** - Whisper AI in the browser
- **OpenAI Whisper** - State-of-the-art speech recognition
- **Next.js** - React framework
- **Tailwind CSS** - Styling framework

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Made with ❤️ using Next.js, FFmpeg.wasm, and Whisper AI**

**Neural Groove Spectrum Divergent** - Professional media processing, right in your browser.
