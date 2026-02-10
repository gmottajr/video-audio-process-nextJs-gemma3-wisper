# Test Fixtures for Fast Mode Benchmarking

This directory contains audio test files for performance benchmarking.

## Required Files

- `sample-5min-clean.wav` - 5-minute clean speech
- `sample-10min-noisy.wav` - 10-minute with background noise
- `sample-15min-podcast.wav` - 15-minute multi-speaker conversation
- `sample-30min-lecture.wav` - 30-minute academic lecture
- `sample-1min-short.wav` - 1-minute brief speech (edge case)

## Format Requirements

- Format: WAV (uncompressed PCM)
- Sample rate: 16000 Hz (required for Whisper)
- Channels: Mono
- Bit depth: 16-bit

## Sources

### Recommended Sources (Public Domain)

1. **LibriVox** (https://librivox.org/)
   - Public domain audiobooks
   - Good for: Clean speech, various accents

2. **OpenSLR** (https://www.openslr.org/)
   - Open speech datasets
   - Good for: Research-quality audio

3. **Wikimedia Commons** (https://commons.wikimedia.org/wiki/Category:Audio_files)
   - CC-BY-SA or public domain
   - Good for: Lectures, speeches

### Self-Recorded

For consistency and known content:
- Record using phone/computer
- Include variety: quiet room, noisy cafe, outdoor
- Ensures known content for WER validation

## Usage

Run benchmarks:
```bash
pnpm perf:benchmark:fast --label=baseline
pnpm perf:compare baseline.json results.json
```

## Notes

- Files are gitignored by default (may be large)
- See `manifest.json` for metadata
- Ensure files match expected format before benchmarking
