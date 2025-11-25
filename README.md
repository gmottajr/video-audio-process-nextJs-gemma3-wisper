# Browser FFmpeg POC - Video & Audio Processing

A proof-of-concept Next.js application demonstrating client-side video and audio processing using FFmpeg WebAssembly. This single-page application runs entirely in the browser with no backend server required.

## ⚡ Performance-First Philosophy

**This is a HIGH-PERFORMANCE web application that requires cutting-edge browser features.**

- ✅ **Optimized for**: Chrome 90+ / Edge 90+ only
- ❌ **Not compatible with**: Firefox, Safari, older browsers
- 🎯 **Priority**: Maximum performance > Broad compatibility
- 🚀 **Requirements**: Latest browser versions with full WebAssembly and SharedArrayBuffer support

If you need cross-browser compatibility, this is NOT the right approach. This POC prioritizes speed, efficiency, and modern web capabilities.

## 🎯 Project Overview

This POC showcases browser-based media processing capabilities by:
- Extracting audio tracks from video files and converting them to WAV format
- **AI-powered transcription**: Convert speech to text using Whisper AI (100% client-side)
- Generating interactive waveform visualizations
- Displaying comprehensive file metadata
- Monitoring resource usage (memory, CPU) during processing
- All processing happens client-side using WebAssembly

## ✨ Key Features

### Media Processing
- **File Upload**: Drag-and-drop or file input for video/audio files
- **Audio Extraction**: Extract audio tracks from video and convert to lossless WAV format
- **Audio Conversion**: Convert audio to multiple formats:
  - **MP3** (MPEG Audio Layer 3, VBR ~190 kbps)
  - **WAV** (PCM 16-bit, CD Quality, Lossless)
  - **AAC** (Advanced Audio Coding, M4A container, 192 kbps)
  - **OGG Vorbis** (Open format, VBR ~160 kbps)
- **AI Transcription** 🤖: Convert speech to text using OpenAI's Whisper model
  - Runs 100% in the browser (completely private, no server calls)
  - Word-level timestamps for precise synchronization
  - Export as TXT, JSON, or SRT (subtitle format)
  - ~40MB model download on first use (cached afterward)
- **Metadata Extraction**: Codec information, duration, bitrate, and file details

### Visualization & Monitoring
- **Waveform Rendering**: Interactive audio waveform using wavesurfer.js
  - Zoomable and playable waveform
  - Timeline and playback controls
- **Resource Monitoring**: Real-time tracking of:
  - Memory usage (before/after processing)
  - CPU usage approximation via processing duration
  - Elapsed time as proxy for computational load

### User Experience
- **Progress Tracking**: Visual indicators during processing operations
- **Download Output**: Export processed audio/video files
- **Error Handling**: Graceful handling of large files and processing errors
- **Responsive Design**: Works across desktop and tablet devices

## 🛠️ Technical Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js (React-based) |
| **Media Processing** | @ffmpeg/ffmpeg, @ffmpeg/util (WebAssembly) |
| **AI Transcription** | @xenova/transformers (Whisper AI via WASM/WebGPU) |
| **Waveform Visualization** | wavesurfer.js |
| **Styling** | Tailwind CSS |
| **State Management** | React Hooks (useState, useEffect) |
| **Performance Monitoring** | Browser APIs (performance.memory, performance.now(), navigator.deviceMemory) |
| **Concurrency** | Web Workers for non-blocking processing |
| **Future Enhancement** | WebCodecs API for native browser decoding |

## ⚠️ Critical Implementation Requirements

Before starting implementation, these are **non-negotiable** technical requirements:

### 1. next.config.mjs MUST be configured
Without these headers, FFmpeg.wasm will fail to load. Create this file first:

```javascript
// next.config.mjs
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

### 2. Blob Memory Management MUST be implemented
Every blob URL must be revoked. Memory leaks will crash the browser after 3-5 file processes.

```typescript
// ALWAYS revoke blob URLs
URL.revokeObjectURL(blobUrl);

// ALWAYS terminate FFmpeg after processing
ffmpeg.terminate();
```

### 3. Metadata Extraction via Log Parsing
Don't use `-f ffmetadata` - it's slower and more complex. Parse FFmpeg logs directly for Duration, Bitrate, Codec info.

### 4. CPU Monitoring via Speed Metric
Parse `speed=X.Xx` from FFmpeg logs instead of using elapsed time. This provides actual processing efficiency.

### 5. Chrome/Edge Only
Don't add fallbacks for other browsers. Use `performance.memory` directly with `@ts-ignore`.

## 🏗️ Architecture

This project follows **Clean Architecture** and **SOLID Principles** to ensure maintainability, extensibility, and testability.

### SOLID Principles Implementation

#### 🔓 Open/Closed Principle (OCP)
- **Audio Formats Configuration** (`utils/audioFormats.ts`): New audio formats (FLAC, OPUS, etc.) can be added without modifying existing code. Simply add a new entry to the `SUPPORTED_AUDIO_FORMATS` array.

#### 🎯 Single Responsibility Principle (SRP)
- **`useFFmpeg` Hook**: Responsible ONLY for FFmpeg engine management (loading, execution, termination).
- **`useAudioConverter` Hook**: Handles ONLY audio conversion logic, delegates FFmpeg execution to `useFFmpeg`.
- **`ConversionControls` Component**: Handles ONLY user input for format selection, doesn't know about FFmpeg internals.

#### 🔄 Dependency Inversion Principle (DIP)
- **`useAudioConverter`** depends on the abstract `AudioFormatConfig` interface, not concrete format implementations.
- **UI Components** receive callbacks (`onConvert`, `onFileSelect`) instead of directly calling business logic.

#### 🧩 Interface Segregation Principle (ISP)
- **Components** have minimal, focused prop interfaces.
- **`ConversionControls`** only exposes `onConvert`, `isProcessing`, and `disabled` - nothing more.

### Component Structure

```
src/
├── components/
│   ├── FileUploader.tsx        # File upload with drag-drop support
│   ├── ConversionControls.tsx  # Format selector UI (ISP)
│   ├── WaveformViewer.tsx      # Wavesurfer.js integration
│   ├── MetadataDisplay.tsx     # File and codec metadata rendering
│   └── ResourceMonitor.tsx     # Performance metrics display
├── hooks/
│   ├── useFFmpeg.ts            # FFmpeg engine management (SRP)
│   ├── useAudioConverter.ts    # Audio conversion logic (SRP + DIP)
│   └── useResourceMonitor.ts   # Resource tracking logic
└── utils/
    ├── audioFormats.ts         # Format configurations (OCP)
    └── cn.ts                   # Tailwind utility
```

### Processing Flow

1. **Upload**: User uploads video/audio file → Read as Blob
2. **Initialize**: Load FFmpeg.wasm (lazy-loaded on demand)
3. **Extract Metadata**: Run FFmpeg command `-i input -f ffmetadata`
4. **Process Audio**: Extract audio track → Convert to WAV
5. **Visualize**: Render waveform from processed WAV blob
6. **Monitor**: Track memory usage and processing time
7. **Output**: Provide download link for processed file

### FFmpeg Commands & Metadata Extraction

```bash
# Extract audio to WAV
ffmpeg -i input.mp4 -vn -acodec pcm_s16le output.wav

# Convert video to compressed MP4
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast output.mp4
```

**Metadata Extraction Strategy** (Optimized):

Instead of using `-f ffmetadata metadata.txt` (which creates a file you must read back and parse), **parse FFmpeg's log output directly**:

```typescript
// FFmpeg automatically outputs metadata to stderr when loading a file
ffmpeg.on('log', ({ type, message }) => {
  if (type === 'fferr') {
    // Parse for duration: Duration: 00:01:23.45
    const durationMatch = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    
    // Parse for bitrate: bitrate: 1234 kb/s
    const bitrateMatch = message.match(/bitrate:\s*(\d+)\s*kb\/s/);
    
    // Parse for codec: Video: h264 (High)
    const codecMatch = message.match(/Video:\s*(\w+)/);
    
    // Parse for resolution: 1920x1080
    const resolutionMatch = message.match(/(\d{3,4})x(\d{3,4})/);
    
    // Store metadata in state
    setMetadata({
      duration: durationMatch ? calculateSeconds(durationMatch) : null,
      bitrate: bitrateMatch ? parseInt(bitrateMatch[1]) : null,
      codec: codecMatch ? codecMatch[1] : null,
      resolution: resolutionMatch ? `${resolutionMatch[1]}x${resolutionMatch[2]}` : null,
    });
  }
});
```

**Why This Approach?**
- ✅ Faster: No extra file I/O in virtual file system
- ✅ More reliable: FFmpeg always outputs this info
- ✅ Simpler: Direct parsing vs file read + parse
- ✅ Real-time: Get metadata during initial file load

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **Modern Chromium-based browser** (Chrome 90+, Edge 90+) with WebAssembly and SharedArrayBuffer support

**⚠️ Performance-First Approach**: This application is optimized for **Chrome/Edge only**. Cross-browser compatibility is not a priority—we prioritize performance and cutting-edge features.

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd video-audio-process-poc-nextJs

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

## 📋 Usage

1. **Upload a File**: Drag and drop or click to select a video/audio file
2. **View Preview**: See file information and thumbnail (for videos)
3. **Start Processing**: Click "Start Processing" button
4. **Monitor Progress**: Watch real-time progress and resource usage
5. **View Results**: 
   - Check extracted metadata
   - Interact with audio waveform
   - Monitor resource consumption
6. **Download**: Save the processed audio/video file

## 🤖 AI Transcription Feature

### How It Works

The application includes a client-side AI transcription feature powered by **OpenAI's Whisper model** running entirely in your browser through Transformers.js.

**Key Benefits:**
- ✅ **100% Private**: No data leaves your computer—transcription happens locally
- ✅ **No Server Required**: The AI model runs via WebAssembly/WebGPU
- ✅ **Word-Level Timestamps**: Get precise synchronization for each word
- ✅ **Multiple Export Formats**: Download as TXT, JSON, or SRT (subtitles)

### Technical Implementation

1. **Model**: Uses `Xenova/whisper-tiny` (quantized version, ~40MB)
   - First run: Model downloads automatically from CDN
   - Subsequent runs: Model is cached in the browser

2. **Audio Preprocessing**: FFmpeg converts audio to 16kHz mono WAV (Whisper's required format)
   - Command: `-ar 16000 -ac 1 -acodec pcm_s16le`

3. **Web Worker Architecture**: AI inference runs in a separate thread to keep UI responsive
   - Worker file: `/public/transcription.worker.js`
   - Communication via `postMessage` API

4. **Export Formats**:
   - **TXT**: Plain text transcript
   - **JSON**: Structured data with timestamps
   - **SRT**: Industry-standard subtitle format (HH:MM:SS,mmm)

### Usage

1. Upload any video or audio file
2. Click the **"Transcribe Audio to Text"** button (purple gradient)
3. Wait for:
   - Model download (~40MB, first time only)
   - Audio preprocessing (FFmpeg)
   - AI transcription (depends on file duration)
4. View the transcript with timestamps
5. Download in your preferred format

### Performance Notes

- **Model Size**: ~40MB download (one-time)
- **Processing Speed**: ~10-20x faster than real-time on modern hardware
- **Memory Usage**: Requires ~500MB RAM during transcription
- **Browser Support**: Chrome/Edge 90+ (requires WebAssembly and WebGPU)

## ⚠️ Limitations & Constraints

### File Size
- **Recommended**: < 50MB for optimal performance
- **Maximum**: ~ 100MB (WebAssembly memory limits)
- **Warning**: Larger files may cause memory issues or browser crashes

### Browser Requirements
- **Required**: Chrome 90+ or Edge 90+ (Chromium-based)
- **Not Supported**: Firefox, Safari (intentionally - we prioritize performance over compatibility)
- **APIs Used**: `performance.memory`, SharedArrayBuffer, WebAssembly threads
- **Philosophy**: Cutting-edge features for maximum performance, not broad compatibility

### Processing Capabilities
- GPU usage not directly measurable (processing time used as proxy)
- Complex filters may be slow due to WebAssembly overhead
- Some codecs may not be supported by FFmpeg.wasm build

## 🎨 UI Design

### Layout Sections

- **Header**: Project title and instructions
- **Upload Zone**: Drag-drop area with file input fallback
- **Metadata Panel**: File details, codec info, duration
- **Processing Status**: Progress bar with percentage and time elapsed
- **Resource Monitor**: Memory usage, CPU load estimation
- **Waveform Viewer**: Interactive audio visualization
- **Output Section**: Download buttons for processed files

### Styling
- Minimalist design with blue accent colors
- Responsive grid/flexbox layout (Tailwind CSS)
- Loading spinners and progress indicators
- Optional dark mode support

## 🔒 Best Practices & Security

### CORS Handling
FFmpeg.wasm requires proper CORS configuration for loading WebAssembly files. Always use `toBlobURL` utility:

```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
});
```

### Cross-Origin Isolation ⚠️ CRITICAL
FFmpeg.wasm **will not load** without these headers. Multi-threading requires SharedArrayBuffer support.

**You MUST create this configuration file:**

```javascript
// next.config.mjs
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

**⚠️ Important Side Effects**: This configuration has consequences:

1. **External Resources Break**: Cannot load images/fonts from external CDNs (e.g., avatars, Google Fonts) unless they serve `Cross-Origin-Resource-Policy: cross-origin` header
2. **Solution**: Keep all assets local in `/public` folder or use a proxy
3. **Third-party Scripts**: External analytics/tracking scripts may fail
4. **Workaround**: Self-host everything or use a service worker proxy

**Example of what breaks:**
```html
<!-- ❌ This will fail -->
<img src="https://avatars.githubusercontent.com/u/123456" />

<!-- ✅ This works -->
<img src="/public/avatar.jpg" />
```

### Web Workers
Process media in dedicated workers to prevent UI blocking:

```typescript
// Offload FFmpeg processing to worker
const worker = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url));
worker.postMessage({ file, command: 'extract-audio' });
```

### Memory Management ⚠️ CRITICAL

**Blob Memory Leaks**: Video processing creates large Blobs. Processing multiple files without cleanup **will crash the browser tab**.

**Required Cleanup Pattern:**

```typescript
// Store blob URLs for cleanup
const [blobUrls, setBlobUrls] = useState<string[]>([]);

// Create blob URL
const url = URL.createObjectURL(blob);
setBlobUrls(prev => [...prev, url]);

// Cleanup in useEffect
useEffect(() => {
  return () => {
    blobUrls.forEach(url => URL.revokeObjectURL(url));
  };
}, [blobUrls]);

// Add "Clear" button to manually free memory
const handleClear = () => {
  blobUrls.forEach(url => URL.revokeObjectURL(url));
  setBlobUrls([]);
  ffmpeg.terminate(); // Free FFmpeg resources
};
```

**Memory Monitoring** (Chrome/Edge only - acceptable for our performance-first approach):

```typescript
// useResourceMonitor.ts
const getMemoryUsage = () => {
  // @ts-ignore - performance.memory is non-standard but available in Chrome/Edge
  if (performance && performance.memory) {
    // @ts-ignore
    return performance.memory.usedJSHeapSize;
  }
  return null; // Display "N/A" in UI for unsupported browsers
};
```

**CPU Usage Monitoring** (Better than elapsed time):

FFmpeg emits a `speed` metric in its progress logs that indicates processing efficiency:

```typescript
// Parse FFmpeg progress for speed metric
ffmpeg.on('progress', ({ progress, time }) => {
  // FFmpeg also logs: frame=123 fps=30 q=28.0 size=1234kB time=00:00:05.00 bitrate=1234.0kbits/s speed=1.4x
  // Parse for speed metric
});

ffmpeg.on('log', ({ message }) => {
  const speedMatch = message.match(/speed=\s*(\d+(\.\d+)?)x/);
  if (speedMatch) {
    const speed = parseFloat(speedMatch[1]);
    
    // Interpret the metric:
    if (speed < 1.0) {
      // CPU is struggling - processing slower than real-time
      setProcessingStatus('High CPU load - struggling');
    } else if (speed >= 1.0 && speed < 2.0) {
      // Normal processing
      setProcessingStatus('Normal CPU load');
    } else {
      // Processing faster than real-time - CPU handling easily
      setProcessingStatus('Low CPU load - efficient');
    }
    
    setCpuEfficiency(speed); // Display as "Processing Efficiency: 1.4x"
  }
});
```

**Why This Is Better Than Elapsed Time:**
- ✅ Shows **relative performance** (1x = real-time, 2x = twice as fast)
- ✅ Independent of file length
- ✅ Directly indicates CPU capability
- ✅ Standard FFmpeg metric, no custom calculation needed

**Best Practices:**
- Free FFmpeg resources after processing: `ffmpeg.terminate()`
- Revoke all blob URLs when done: `URL.revokeObjectURL(url)`
- Limit concurrent processing operations (max 1 at a time)
- Validate file sizes before loading (reject > 100MB)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Optional: Enable performance monitoring debug logs
NEXT_PUBLIC_DEBUG_PERFORMANCE=false

# File size limits (in MB)
NEXT_PUBLIC_MAX_FILE_SIZE=100
NEXT_PUBLIC_RECOMMENDED_FILE_SIZE=50
```

## 🔍 Troubleshooting

### Common Issues

**FFmpeg fails to load**
- ✅ Check cross-origin isolation headers are set
- ✅ Verify `toBlobURL` is used for loading core files
- ✅ Check browser console for CORS errors
- ✅ Ensure HTTPS (required for SharedArrayBuffer in most browsers)

**Out of memory errors**
- ✅ Reduce file size (< 50MB recommended)
- ✅ Call `ffmpeg.terminate()` after each operation
- ✅ Close other browser tabs to free memory
- ✅ Use Chrome's Task Manager to monitor memory usage

**Slow processing**
- ✅ Verify Web Workers are being used
- ✅ Check if multiple processes are running simultaneously
- ✅ Consider using WebCodecs for supported formats
- ✅ Test on different browsers (Chrome typically fastest)

**Waveform not displaying**
- ✅ Verify WAV file was created successfully
- ✅ Check browser console for wavesurfer.js errors
- ✅ Ensure audio data exists in processed file
- ✅ Try different audio formats (PCM 16-bit recommended)

**Browser compatibility issues**
- ✅ **Use Chrome 90+ or Edge 90+ only** (this is a hard requirement)
- ❌ Safari, Firefox not supported (by design - performance > compatibility)
- ⚠️ Mobile browsers not recommended (memory constraints, slower performance)

### Debug Mode

Enable verbose logging:

```typescript
ffmpeg.on('log', ({ message }) => {
  console.log('[FFmpeg]', message);
});

ffmpeg.on('progress', ({ progress, time }) => {
  console.log(`Progress: ${progress * 100}% | Time: ${time}ms`);
});
```

## 🧪 Testing

The project includes a comprehensive unit test suite to verify setup scripts and project integrity.

### **Test Suites**
- **FFmpeg Setup** (10 tests): Verifies `public/ffmpeg/` files
- **AI Model Setup** (31 tests): Verifies `public/models/` and Transformers.js
- **Project Integrity** (43 tests): Verifies architecture and configuration

**Total: 84 tests** ✅

### **Run Tests**
```bash
# Run all tests
npm test

# Run specific suite
npm run test:setup        # Only setup scripts
npm run test:integrity    # Only architecture

# Watch mode (auto-rerun)
npm run test:watch

# Coverage report
npm run test:coverage
```

### **What Tests Verify**
✅ FFmpeg core files exist and have correct sizes  
✅ AI model files downloaded correctly  
✅ Transformers.js library is present  
✅ All hooks, components, and utilities exist  
✅ Next.js COOP/COEP headers configured  
✅ `.gitignore` excludes large binaries  

See `__tests__/README.md` for detailed test documentation.

## 📦 Dependencies

### Core Dependencies
```json
{
  "@ffmpeg/ffmpeg": "^0.12.x (v7.x recommended for latest bug fixes)",
  "@ffmpeg/util": "^0.12.x",
  "wavesurfer.js": "^7.x",
  "next": "^14.x",
  "react": "^18.x",
  "tailwindcss": "^3.x"
}
```

**Note**: FFmpeg.wasm v7.x includes important bug fixes and performance improvements. Update when available for production use.

## 🛣️ Roadmap

### Features
- [ ] Add support for more output formats (MP3, OGG, etc.)
- [ ] Implement video trimming functionality
- [ ] Add audio effects (normalize, fade, etc.)
- [ ] Batch processing support
- [ ] Progressive Web App (PWA) support
- [ ] IndexedDB for caching processed files

### Performance Optimizations
- [ ] **WebCodecs API Integration**: Use native browser codecs for decoding, reducing FFmpeg overhead
  - Native H.264/VP8/VP9 decoding via `VideoDecoder`
  - Fallback to FFmpeg for unsupported formats
- [ ] **WebGPU Integration**: Hardware-accelerated video processing
- [ ] **Hybrid Processing**: Optional backend for files > 100MB

### Testing & Benchmarking
- [ ] Performance benchmarks on Chrome/Edge with different hardware (CPU cores, RAM)
- [ ] Document processing times and speed metrics for various file sizes (10MB, 50MB, 100MB)
- [ ] Memory leak testing (sequential processing of 10+ files)
- [ ] Codec performance comparison (H.264 vs VP9 vs AV1)
- [ ] Edge case testing (corrupted files, unsupported formats, memory limits)

## 📊 Performance Benchmarks

### Recommended Testing Methodology

To validate performance across browsers and configurations:

```bash
# Test file sizes
- Small: 10MB video (720p, 30s)
- Medium: 50MB video (1080p, 2min)
- Large: 100MB video (1080p, 5min)

# Metrics to track
- Initial load time (FFmpeg.wasm initialization)
- Processing time (audio extraction)
- Memory usage (before/after)
- CPU efficiency (FFmpeg speed metric)
- Blob memory cleanup verification
```

### Expected Performance Metrics (Target - Chrome/Edge)

| File Size | Processing Time | Memory Usage | Speed Metric |
|-----------|----------------|--------------|--------------|
| 10MB      | 5-10s          | +50MB        | 1.5-2.0x     |
| 50MB      | 20-40s         | +200MB       | 1.0-1.5x     |
| 100MB     | 60-120s        | +400MB       | 0.8-1.2x     |

*Note: Actual performance varies by hardware, codec, and CPU cores. Speed metric indicates processing efficiency (>1.0x = faster than real-time)*

### Edge Cases to Test

- ✅ Files > 100MB (should show warning/rejection)
- ✅ Corrupted/invalid files (graceful error handling)
- ✅ Unsupported codecs (fallback messaging)
- ✅ Simultaneous processing (should be blocked - max 1 at a time)
- ✅ Browser memory limits (prevent crashes via blob cleanup)
- ✅ Sequential processing (5+ files - verify no memory leaks)
- ✅ User navigation during processing (cleanup on unmount)

### Performance Optimization Tips

1. **Use Web Workers**: Keep UI responsive during processing
2. **Lazy Load FFmpeg**: Load only when needed (~31MB download)
3. **Chunk Processing**: For large files, process in segments if possible
4. **WebCodecs First**: Use native decoders before FFmpeg when available
5. **Monitor Memory**: Terminate FFmpeg instance after each operation

## 🤝 Contributing

This is a proof-of-concept project. Contributions, issues, and feature requests are welcome!

## 📝 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - WebAssembly port of FFmpeg
- [wavesurfer.js](https://wavesurfer-js.org/) - Audio waveform visualization
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📚 Resources

### Official Documentation
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg.wasm GitHub](https://github.com/ffmpegwasm/ffmpeg.wasm)
- [WebAssembly](https://webassembly.org/)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

### Advanced APIs
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) - Native browser media encoding/decoding
- [WebGPU](https://gpuweb.github.io/gpuweb/) - GPU acceleration in browsers
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) - Direct file system access

### Learning Resources
- [FFmpeg Command Reference](https://ffmpeg.org/ffmpeg.html)
- [WebAssembly Performance Best Practices](https://web.dev/webassembly/)
- [Browser Media Capabilities](https://caniuse.com/?search=webcodecs)

## 🌐 Community & Feedback

This project is perfect for sharing and gathering feedback from the web development community:

### Share Your Experience
- **Reddit**: Post to [r/webdev](https://reddit.com/r/webdev), [r/nextjs](https://reddit.com/r/nextjs), [r/javascript](https://reddit.com/r/javascript)
- **Dev.to**: Write a tutorial or case study about your implementation
- **Medium**: Share insights on browser-based media processing
- **Twitter/X**: Tag #WebDev, #NextJS, #FFmpeg, #WebAssembly
- **Hacker News**: Submit to Show HN for technical feedback

### Discussion Topics
- Performance comparisons: FFmpeg.wasm vs WebCodecs
- Memory optimization strategies for large files
- Cross-browser compatibility challenges
- Real-world use cases for client-side processing
- Hybrid approaches (client + server) for production

### Get Feedback
- **GitHub Discussions**: Enable for Q&A and feature requests
- **Stack Overflow**: Tag questions with `ffmpeg-wasm`, `nextjs`, `webassembly`
- **Discord/Slack**: Join web development communities for live discussions

---

**Note**: This is a proof-of-concept application intended for demonstration and educational purposes. For production use, consider:
- **Hybrid architecture**: Offload heavy processing to backend services for files > 100MB
- **CDN hosting**: Serve FFmpeg.wasm files from a reliable CDN
- **Error tracking**: Implement Sentry or similar for monitoring browser compatibility issues
- **Progressive enhancement**: Detect browser capabilities and provide appropriate fallbacks

**Production Evolution**: Start with client-side processing for small files, then progressively enhance with server-side processing for larger files or unsupported browsers.

