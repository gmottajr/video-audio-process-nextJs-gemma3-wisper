# Fast Mode User Guide

## What is Fast Mode?

Fast Mode is an optimized transcription mode that processes audio 35-50% faster than Standard Mode by using parallel processing and an optimized English-only model.

## When to Use Fast Mode

**Best for:**
- English-only content (podcasts, meetings, lectures)
- Speed is priority over word-level timestamp precision
- Long-form content where time savings matter

**Not recommended for:**
- Multilingual content (use Standard Mode)
- When word-level timestamps are required
- Non-English audio

## How to Enable Fast Mode

1. Upload your audio/video file
2. In the "Review & Configure" screen, select **"Fast Mode (Beta)"** radio option
3. The model selector will automatically switch to Distil-Whisper
4. Audio enhancement options will be automatically disabled
5. Click "Start AI Transcription"

## What to Expect

### Speed
- **35-50% faster** than Standard Mode
- Processing time scales with audio length
- Progress shows "Processing chunk X of Y" with worker status

### Quality
- **English-only:** Uses Distil-Whisper model optimized for English
- **Sentence-level timestamps:** No word-level precision (Standard Mode has word-level)
- **Accuracy:** ~99% of Standard Mode accuracy for English content

### Limitations
- **English only:** Will not work well for other languages
- **No word timestamps:** Only sentence-level timestamps available
- **Beta status:** May have occasional issues (report via feedback)

## Troubleshooting

### Fast Mode Not Available
- Check that `ENABLE_FAST_MODE` feature flag is enabled
- Ensure browser supports Web Workers (all modern browsers do)

### Slow Performance
- Check worker status badge (should show "2/2" workers active)
- If memory pressure detected, workers may reduce to 1 (automatic)
- Try Standard Mode if issues persist

### Poor Quality Results
- Ensure audio is English-only
- Check audio quality (noisy audio may need Standard Mode with enhancements)
- Try Standard Mode for comparison

### Worker Crashes
- Fast Mode will automatically re-queue failed chunks
- If all workers crash, falls back to Standard Mode automatically
- Check browser console for error messages

## Technical Details

- **Chunk size:** 30 seconds with 3-second overlap
- **Workers:** 2 parallel workers (default)
- **Memory:** ~1.2GB peak usage for 2-worker configuration
- **Model:** Distil-Whisper Small (166MB, English-only)

## Feedback

If you encounter issues with Fast Mode:
1. Note the error message (if any)
2. Check browser console for details
3. Report via feedback mechanism
4. Include browser/device information
