# 🎙️ Speaker-Aware Transcript Formatting Feature

## Overview

Added intelligent transcript formatting with speaker diarization (detection) and optional timestamps. Users can now view their transcripts with each speaker on a separate line, making conversations and meetings much more readable.

## ✨ New Features

### 1. **Speaker Detection & Separation**
- Automatically detects when different people are speaking
- Each speaker's words appear on a separate line
- Labeled as "Speaker 1", "Speaker 2", etc.
- Smart detection based on:
  - Pauses between speakers
  - Question-answer patterns
  - Conversational turn-taking markers

### 2. **Optional Timestamps**
- Toggle timestamps on/off with a checkbox
- Timestamps show when each speaker starts talking
- Format: `[MM:SS]` or `[HH:MM:SS]` for longer content
- Example: `[02:35] Speaker 1: Good morning everyone...`

### 3. **Adjustable Sensitivity**
- **Low**: Only detects long pauses (3+ seconds) - good for single speakers with long pauses
- **Medium** (default): Normal conversation pauses (1.5+ seconds) - best for most meetings
- **High**: Detects even brief pauses (0.8+ seconds) - good for fast-paced conversations

### 4. **Works with AI Enhancement**
- Original transcripts show speakers based on Whisper's timing data
- Enhanced transcripts maintain speaker structure while showing AI-improved text
- Speaker detection happens automatically in the background

## 🎨 User Interface

### New Component: Formatting Controls
Located above the transcript tabs, includes:

1. **Show Timestamps** checkbox
   - 📍 Blue clock icon
   - Toggle time markers for each speaker turn

2. **Separate by Speaker** checkbox
   - 👥 Green users icon  
   - Toggle speaker diarization on/off

3. **Sensitivity Slider** (appears when speaker separation is enabled)
   - Three levels: Low, Medium, High
   - Helpful descriptions for each level

## 📁 File Changes

### New Files Created

#### `utils/speakerFormatter.ts`
Core formatting logic:
- `detectSpeakerChanges()` - Identifies when speakers change using timing and linguistic cues
- `groupIntoSpeakerTurns()` - Groups transcript chunks by speaker
- `formatTranscriptWithSpeakers()` - Formats raw Whisper transcript
- `formatEnhancedTranscriptWithSpeakers()` - Formats AI-enhanced transcript
- `formatTimestamp()` - Converts seconds to readable timestamps
- `getSpeakerStats()` - Calculates speaking time and turn counts

#### `components/TranscriptFormattingControls.tsx`
UI component for formatting options:
- Checkboxes for timestamps and speaker labels
- Sensitivity selector (Low/Medium/High)
- Helpful tooltips and descriptions
- Modern, accessible design

### Modified Files

#### `components/states/DoneStateView.tsx`
- Added `FormattingOptions` state
- Applied formatting to both original and enhanced transcripts
- Integrated `TranscriptFormattingControls` component
- Passes Whisper chunks to formatting functions

## 🔧 Technical Implementation

### Speaker Detection Algorithm

The system uses multiple heuristics to identify speaker changes:

1. **Pause Detection**
   ```typescript
   const pause = currentChunk.startTime - previousChunk.endTime;
   if (pause >= threshold) {
     // New speaker detected
   }
   ```

2. **Question-Answer Patterns**
   - Detects questions ending with "?"
   - Short pause after question = likely speaker change

3. **Conversational Markers**
   - Words like "yeah", "well", "so", "okay" often start new turns
   - Combined with timing to avoid false positives

### Example Output

**Without Formatting:**
```
um so basically what we're trying to do here is uh you know create a better 
system for like tracking our progress okay so let me show you what I mean 
yeah that makes sense but how are we going to uh you know implement that 
exactly well I think we should start by looking at the current process
```

**With Speaker Labels:**
```
**Speaker 1**: So basically, what we're trying to do here is create a better 
system for tracking our progress. Let me show you what I mean.

**Speaker 2**: Yeah, that makes sense. But how are we going to implement that 
exactly?

**Speaker 1**: Well, I think we should start by looking at the current process.
```

**With Timestamps + Speakers:**
```
[00:12] **Speaker 1**: So basically, what we're trying to do here is create a 
better system for tracking our progress. Let me show you what I mean.

[00:24] **Speaker 2**: Yeah, that makes sense. But how are we going to implement 
that exactly?

[00:35] **Speaker 1**: Well, I think we should start by looking at the current 
process.
```

## 🎯 Use Cases

### Perfect For:
- ✅ **Meetings & Interviews** - Clear speaker identification
- ✅ **Podcasts & Discussions** - Track who said what
- ✅ **Presentations** - Separate Q&A from main content
- ✅ **Training Videos** - Distinguish instructor from participants

### Less Useful For:
- ❌ Single speaker monologues (can turn off speaker labels)
- ❌ Music or non-speech audio
- ❌ Heavily overlapping speech (may not detect accurately)

## 🚀 User Workflow

1. **Transcribe audio** (Whisper provides word-level timestamps)
2. **Enable AI Enhancement** (optional but recommended)
3. **Open Formatting Controls** (automatically visible)
4. **Toggle Options:**
   - ✓ Separate by Speaker (recommended for conversations)
   - ✓ Show Timestamps (optional)
   - Choose Sensitivity Level (Medium is default)
5. **View Formatted Transcript** in any tab (Original, Enhanced, Side-by-Side, Diff)
6. **Export** - Formatted text is included in TXT/JSON exports

## 🎨 Design Considerations

### Why This Design?

1. **Non-Intrusive**: Formatting controls appear only when transcription is complete
2. **Progressive Enhancement**: Works with or without AI enhancement
3. **Flexible**: Users control exactly what they see
4. **Context-Aware**: Default medium sensitivity works for most use cases
5. **Accessible**: Clear labels, good color contrast, keyboard-friendly

### Performance

- Speaker detection runs once when options change
- Results are cached until formatting changes
- Minimal impact on UI responsiveness
- Works with transcripts of any length (already chunked for AI processing)

## 🔮 Future Enhancements

Potential improvements (not yet implemented):

1. **Manual Speaker Naming**
   - Let users rename "Speaker 1" → "John"
   - Persist names in session storage

2. **Speaker Recognition**
   - Train on voice characteristics
   - Automatic speaker identification

3. **Advanced Diarization**
   - Use ML models for more accurate detection
   - Handle overlapping speech

4. **Export Formats**
   - Dedicated speaker-aware export formats
   - Include speaker stats in JSON export

5. **Visual Timeline**
   - Show speaker turns on a timeline
   - Click to jump to specific moments

## 📊 Testing Recommendations

Test with various audio types:
- ✅ 2-person conversation (ideal case)
- ✅ Multi-person meeting (3-5 speakers)
- ✅ Podcast with clear turn-taking
- ✅ Interview with questions and answers
- ✅ Single speaker with pauses (verify no false speaker changes)

## 🎉 Summary

This feature transforms raw transcripts into readable, structured conversations. Users can:
- See who said what at a glance
- Track timing of each speaker's contributions
- Control the level of detail shown
- Get professional-looking transcripts instantly

The implementation is clean, performant, and user-friendly, seamlessly integrating with the existing AI enhancement workflow.

