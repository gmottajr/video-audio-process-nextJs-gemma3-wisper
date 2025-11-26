# 🎬 MediaForge - Browser-Based Video & Audio Processing

**A production-ready Next.js application for client-side video and audio processing using FFmpeg WebAssembly and AI-powered transcription.**

[![Tests](https://img.shields.io/badge/tests-370%20passing-brightgreen)](/__tests__) 
[![Coverage](https://img.shields.io/badge/coverage-production--ready-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> **100% client-side processing** • **AI-powered transcription** • **No backend required** • **Production-tested**

---

## 📖 Overview

MediaForge is a high-performance web application that runs entirely in the browser. Extract audio from videos, convert between formats, generate transcripts with AI, and visualize waveforms—all without uploading files to any server.

### ✨ Key Features

- 🎵 **Audio Extraction & Conversion**
  - Extract audio tracks from video files
  - Convert to MP3, WAV, AAC, OGG Vorbis
  - Lossless quality options available

- 🤖 **AI-Powered Transcription**
  - OpenAI Whisper model running in-browser
  - 100% private (no data leaves your device)
  - Word-level timestamps
  - Export as TXT, JSON, or SRT subtitles

- 📊 **Audio Visualization**
  - Interactive waveform viewer
  - Zoomable timeline
  - Playback controls

- 🧠 **Smart Memory Management**
  - Automatic cleanup of resources
  - Robust error handling with retry logic
  - Production-tested for stability

- 📈 **Real-time Monitoring**
  - Memory usage tracking
  - Processing speed metrics
  - Progress indicators

---

## ⚡ Performance-First Architecture

**Optimized for Chrome 90+ / Edge 90+ with cutting-edge browser features.**

- ✅ WebAssembly with SharedArrayBuffer
- ✅ Web Workers for non-blocking processing
- ✅ Optimized memory management
- ✅ Hardware acceleration support

**Browser Compatibility:**
- **Supported**: Chrome 90+, Edge 90+ (Chromium)
- **Not Supported**: Firefox, Safari (intentional—we prioritize performance over broad compatibility)

---

## 🏗️ Architecture

### Production-Ready Design Principles

This application follows **Clean Architecture** and **SOLID principles** with comprehensive test coverage:

- ✅ **370 production tests** (344 unit + 26 integration)
- ✅ **State machine** for predictable application flow
- ✅ **Worker communication patterns** for reliable async operations
- ✅ **Retry logic** with exponential backoff
- ✅ **Memory leak prevention** with automatic cleanup
- ✅ **Error boundaries** and graceful degradation

### Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 14 (React 18) |
| **Media Processing** | FFmpeg.wasm (WebAssembly) |
| **AI Transcription** | Transformers.js (Whisper) |
| **Visualization** | wavesurfer.js |
| **Styling** | Tailwind CSS |
| **State Management** | React Hooks + Context |
| **Testing** | Jest + React Testing Library |
| **Concurrency** | Web Workers |

### Component Architecture

```
src/
├── components/
│   ├── ActionSelector.tsx        # Operation selection UI
│   ├── FileUploader.tsx          # Drag-drop file input
│   ├── TranscriptionDisplay.tsx  # AI transcript viewer
│   ├── WaveformViewer.tsx        # Audio visualization
│   └── ResourceMonitor.tsx       # Performance metrics
├── contexts/
│   └── TranscriberContext.tsx    # AI transcription state
├── hooks/
│   ├── useAppStateMachine.ts     # App state management
│   ├── useMediaProcessor.ts      # Media processing logic
│   └── useTranscriberContext.ts  # Transcription hook
├── lib/
│   ├── WorkerManager.ts          # Worker communication
│   ├── BlobURLManager.ts         # Memory management
│   └── retry.ts                  # Error recovery
└── utils/
    ├── audioFormats.ts           # Format configurations
    └── detectFileType.ts         # File validation
```

### State Management Flow

The application uses a **finite state machine** for predictable state transitions:

```
IDLE → INSPECT → PROCESSING → DONE
  ↑        ↓           ↓        ↓
  ←────────────ERROR←────────────
```

**State Transitions:**
- **IDLE**: Initial state, awaiting file
- **INSPECT**: File selected, ready to process
- **PROCESSING**: Active media processing
- **DONE**: Processing complete, results available
- **ERROR**: Failure occurred, can retry

---

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite

```
✅ Unit Tests:        344 tests passing
✅ Integration Tests:  26 tests passing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TOTAL:            370 TESTS PASSING
```

### Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| **WorkerManager** | 15 tests | ✅ 100% |
| **State Machine** | 8 tests | ✅ 100% |
| **Retry Logic** | 8 tests | ✅ 100% |
| **Blob URL Management** | 8 tests | ✅ 100% |
| **Worker Communication** | 13 tests | ✅ 100% |
| **Transcriber Context** | 5 tests | ✅ 100% |
| **Model Validation** | 62 tests | ✅ 100% |
| **Setup Scripts** | 251+ tests | ✅ 100% |

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run all with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### What Tests Verify

- ✅ State machine transitions (IDLE→INSPECT→PROCESSING→DONE)
- ✅ Worker communication patterns (request/response)
- ✅ Memory leak prevention (Blob URL cleanup)
- ✅ Error handling and retry logic (network errors, timeouts)
- ✅ Concurrent request management
- ✅ File type validation
- ✅ Model integrity (Whisper AI files)
- ✅ Browser API mocking (Worker, AudioContext, Blob)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Modern Chromium browser** (Chrome 90+, Edge 90+)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mediaforge

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start

# Or export static site
npm run build && npm run export
```

---

## ⚙️ Configuration

### Required: Next.js Headers

**⚠️ CRITICAL**: FFmpeg.wasm requires cross-origin isolation. This configuration is **mandatory**.

Create or verify `next.config.mjs`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Side Effects:**
- External resources (CDN images, fonts) require `Cross-Origin-Resource-Policy: cross-origin` header
- Keep assets in `/public` folder or use a proxy
- Third-party scripts may need special handling

### Environment Variables

Optional `.env.local` configuration:

```env
# Performance monitoring
NEXT_PUBLIC_DEBUG_PERFORMANCE=false

# File size limits (MB)
NEXT_PUBLIC_MAX_FILE_SIZE=100
NEXT_PUBLIC_RECOMMENDED_FILE_SIZE=50
```

---

## 📋 Usage Guide

### Basic Workflow

1. **Upload File**
   - Drag and drop video/audio file
   - Or click to browse
   - Supported: MP4, MOV, AVI, MKV, MP3, WAV, etc.

2. **Select Action**
   - **Extract Audio**: Convert video → WAV
   - **Convert Format**: Choose MP3, AAC, OGG
   - **Transcribe**: AI-powered speech-to-text

3. **Process**
   - Monitor progress in real-time
   - View resource usage
   - Cancel if needed

4. **Download Results**
   - Processed audio file
   - Transcript (TXT, JSON, SRT)
   - Waveform visualization

### AI Transcription

**First Time Setup:**
- ~40MB model download (automatic)
- Cached for subsequent uses
- One-time process per browser

**Transcription Process:**
1. Upload audio/video file
2. Click "Transcribe Audio to Text"
3. Wait for:
   - Audio preprocessing (FFmpeg)
   - Model initialization
   - AI inference
4. View transcript with timestamps
5. Export in preferred format

**Performance:**
- **Speed**: ~10-20x faster than real-time
- **Memory**: ~500MB during transcription
- **Privacy**: 100% local processing

---

## 🎯 Production Features

### Error Handling

**Retry Logic with Exponential Backoff:**
```typescript
- Network errors: 3 retries with 2s, 4s, 8s delays
- Cache errors: Special handling with clear instructions
- User-friendly error messages
- Automatic recovery when possible
```

**Error Types Handled:**
- ❌ Network failures (model loading)
- ❌ Invalid file formats
- ❌ Memory constraints
- ❌ Browser compatibility issues
- ❌ Processing timeouts
- ❌ Worker crashes

### Memory Management

**Automatic Cleanup:**
- Blob URL revocation after use
- Worker termination on errors
- FFmpeg instance disposal
- State reset on navigation

**Memory Monitoring:**
- Real-time heap usage tracking
- Before/after processing metrics
- Leak prevention in tests

### Worker Communication

**Robust Pattern:**
- Request/response with unique IDs
- Timeout handling (configurable)
- Concurrent request tracking
- Health monitoring
- Graceful disposal

**Worker Features:**
- Non-blocking UI during processing
- Progress callbacks
- Error propagation
- Statistics tracking

---

## 📊 Performance

### Benchmarks (Chrome 90+)

| File Size | Processing Time | Memory Usage | Speed |
|-----------|----------------|--------------|-------|
| 10MB      | 5-10s          | +50MB        | 1.5-2.0x |
| 50MB      | 20-40s         | +200MB       | 1.0-1.5x |
| 100MB     | 60-120s        | +400MB       | 0.8-1.2x |

*Speed metric: >1.0x = faster than real-time*

### Optimizations

- ✅ Lazy loading (FFmpeg loaded on-demand)
- ✅ Web Workers (non-blocking processing)
- ✅ Progressive loading (model chunks)
- ✅ Memory pooling (Blob URL reuse)
- ✅ Request batching (concurrent ops)

### Limits

- **Recommended**: Files < 50MB
- **Maximum**: ~100MB (WebAssembly limits)
- **Browser**: Chrome/Edge only (intentional)
- **Memory**: 2GB+ RAM recommended

---

## 🔒 Security & Privacy

### Client-Side Processing

- ✅ **No data transmission**: Files never leave your device
- ✅ **No server required**: Fully static deployment possible
- ✅ **No analytics**: Optional, user-controlled
- ✅ **No tracking**: Privacy-first design

### Data Handling

- Files processed in-memory only
- No persistent storage (unless explicitly cached)
- Blob URLs invalidated after use
- Worker memory cleared on disposal

### Security Headers

```javascript
// Recommended additional headers
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

---

## 🔧 Troubleshooting

### Common Issues

**FFmpeg fails to load**
```bash
✅ Check: next.config.mjs has COEP/COOP headers
✅ Check: Using HTTPS (required for SharedArrayBuffer)
✅ Check: Browser console for CORS errors
✅ Solution: Verify toBlobURL usage
```

**Out of memory errors**
```bash
✅ Solution: Process files < 50MB
✅ Solution: Close other browser tabs
✅ Solution: Use Chrome Task Manager to monitor
✅ Check: Are Blob URLs being revoked?
```

**Transcription not working**
```bash
✅ Check: Model files in /public/models/
✅ Check: Browser supports WebAssembly
✅ Solution: Clear browser cache and retry
✅ Check: Console for model loading errors
```

**Performance issues**
```bash
✅ Check: Using Web Workers?
✅ Check: Multiple processes running?
✅ Solution: Process one file at a time
✅ Check: Browser performance settings
```

### Debug Mode

Enable verbose logging:

```typescript
// In browser console
localStorage.setItem('DEBUG', 'true');
```

---

## 📦 Dependencies

### Core Production Dependencies

```json
{
  "@ffmpeg/ffmpeg": "^0.12.10",
  "@ffmpeg/util": "^0.12.1",
  "@xenova/transformers": "^2.x",
  "wavesurfer.js": "^7.x",
  "next": "^14.x",
  "react": "^18.x",
  "tailwindcss": "^3.x"
}
```

### Development Dependencies

```json
{
  "jest": "^29.x",
  "@testing-library/react": "^14.x",
  "@testing-library/jest-dom": "^6.x",
  "jest-environment-jsdom": "^29.x",
  "@swc/jest": "^0.2.x"
}
```

---

## 🛣️ Roadmap

### Planned Features

- [ ] **Video trimming** - Cut video segments
- [ ] **Batch processing** - Multiple files at once
- [ ] **PWA support** - Offline functionality
- [ ] **IndexedDB caching** - Persistent storage
- [ ] **More formats** - FLAC, OPUS, WEBM
- [ ] **Audio effects** - Normalize, fade, filters
- [ ] **Subtitle editor** - Edit SRT files
- [ ] **Theme customization** - Dark/light modes

### Performance Enhancements

- [ ] **WebCodecs API** - Native browser decoding
- [ ] **WebGPU** - Hardware acceleration
- [ ] **Streaming processing** - Handle larger files
- [ ] **Service Worker** - Better caching

### Testing Expansion

- [ ] **E2E tests** - Playwright integration
- [ ] **Performance tests** - Benchmark suite
- [ ] **Visual regression** - Screenshot testing
- [ ] **CI/CD** - GitHub Actions workflow

---

## 🤝 Contributing

We welcome contributions! Please see our guidelines:

### Development Setup

```bash
# Fork and clone
git clone <your-fork>
cd mediaforge

# Install dependencies
npm install

# Run tests
npm test

# Start dev server
npm run dev
```

### Code Standards

- ✅ Write tests for new features
- ✅ Follow TypeScript best practices
- ✅ Use provided ESLint configuration
- ✅ Update documentation
- ✅ Keep test coverage high

### Pull Request Process

1. Create feature branch
2. Write tests (aim for 100% coverage)
3. Update README if needed
4. Ensure all tests pass
5. Submit PR with description

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Open Source Projects

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - WebAssembly FFmpeg
- [Transformers.js](https://github.com/xenova/transformers.js) - ML models in JavaScript
- [wavesurfer.js](https://wavesurfer-js.org/) - Audio visualization
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

### AI Models

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition model
- [Hugging Face](https://huggingface.co/) - Model hosting

---

## 📚 Resources

### Documentation

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg.wasm Guide](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/docs/getting-started.md)
- [Transformers.js Docs](https://huggingface.co/docs/transformers.js)
- [WebAssembly Guide](https://webassembly.org/getting-started/developers-guide/)

### Advanced Topics

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

### Learning Resources

- [FFmpeg Command Reference](https://ffmpeg.org/ffmpeg.html)
- [WebAssembly Best Practices](https://web.dev/webassembly/)
- [Browser Capabilities](https://caniuse.com/?search=webassembly)

---

## 🌐 Community

### Share & Discuss

- **GitHub**: [Issues](../../issues) • [Discussions](../../discussions)
- **Twitter**: Tag #MediaForge #WebAssembly #NextJS
- **Reddit**: [r/webdev](https://reddit.com/r/webdev) • [r/nextjs](https://reddit.com/r/nextjs)
- **Dev.to**: Write tutorials and case studies
- **Stack Overflow**: Tag `ffmpeg-wasm`, `nextjs`

### Get Help

- 📖 Check documentation first
- 🐛 Search existing issues
- 💬 Start a discussion
- ✉️ Open a new issue

---

## 📈 Status

```
✅ Production-Ready
✅ 370 Tests Passing
✅ Comprehensive Documentation
✅ Active Maintenance
```

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Status**: Stable

---

**Built with ❤️ using modern web technologies**

*Transform media in your browser—no uploads, no servers, just pure client-side power.*
