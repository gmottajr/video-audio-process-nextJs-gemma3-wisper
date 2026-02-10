# AI-Powered Speaker Identification Feature

## Overview

This feature adds intelligent speaker identification to transcripts using AI/LLM analysis. Users can optionally provide speaker names, and the AI will validate and use them, or attempt automatic detection based on transcript content.

## Architecture

### Components

#### 1. `SpeakerIdentificationInput` (UI Component)
**Location:** `components/SpeakerIdentificationInput.tsx`

**Purpose:** User interface for collecting speaker names or enabling automatic detection.

**Features:**
- **Three Input Modes:**
  - **Auto Detect** - Fully automatic AI-powered speaker detection
  - **First Speaker** - User provides first speaker name, AI detects others
  - **All Speakers** - User provides all participant names for validation
  
- **AI Detection Toggle** - Enable/disable AI validation and enhancement
- **Dynamic Speaker Count** - Adjusts based on detected speakers in transcript
- **Add/Remove Speakers** - Flexible interface for managing speaker list
- **Visual Feedback** - Shows current mode and expected behavior

**Props:**
```typescript
interface SpeakerIdentificationInputProps {
  onNamesChange: (names: SpeakerNames) => void;
  initialNames?: SpeakerNames;
  speakerCount?: number;
  disabled?: boolean;
}
```

**Data Structure:**
```typescript
interface SpeakerNames {
  mode: 'auto' | 'first-speaker' | 'all-speakers';
  firstSpeaker?: string;
  allSpeakers?: string[];
  useAIDetection: boolean;
}
```

---

#### 2. `speakerIdentifier` (Core Logic)
**Location:** `utils/speakerIdentifier.ts`

**Purpose:** AI-powered speaker detection and validation engine.

**Key Functions:**

##### `identifySpeakers()`
Main function that orchestrates speaker identification based on user input mode.

```typescript
async function identifySpeakers(
  options: SpeakerIdentificationOptions,
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<SpeakerIdentificationResult>
```

**Returns:**
```typescript
interface SpeakerIdentificationResult {
  speakerMap: Map<string, string>;        // "Speaker 1" -> "John Smith"
  confidence: Map<string, number>;         // Confidence scores (0-1)
  detectionMethod: Map<string, SpeakerDetectionMethod>;
  suggestions: SpeakerSuggestion[];        // Alternative suggestions
  warnings: string[];                      // Validation warnings
}
```

**Detection Methods:**
- `user-provided` - Directly from user input
- `self-introduction` - "I'm John", "This is Mary"
- `name-mention` - "Thanks John", "Mary, what do you think?"
- `role-indicator` - "As the interviewer", "Our guest"
- `context-inference` - From conversation patterns
- `pattern-analysis` - Speech patterns and markers
- `unknown` - Could not determine

##### `validateSpeakerNames()`
Validates user-provided names against transcript content.

**Checks:**
- Do names appear in the transcript?
- Are they in the correct order?
- Are there contradictions?
- Did the user make mistakes (typos, wrong order)?

##### `applySpeakerNames()`
Applies identified names to formatted transcript.

```typescript
function applySpeakerNames(
  formattedTranscript: string,
  speakerMap: Map<string, string>
): string
```

##### `getSpeakerIdentificationSummary()`
Provides summary statistics.

```typescript
function getSpeakerIdentificationSummary(
  result: SpeakerIdentificationResult
): {
  identifiedCount: number;
  unknownCount: number;
  averageConfidence: number;
  highConfidenceCount: number;
}
```

**AI Prompts:**

The system uses structured prompts to guide the LLM:

1. **Detection Prompt** - Asks LLM to identify speakers from:
   - Self-introductions
   - Direct address
   - Role indicators
   - Context clues
   - Speech patterns

2. **Validation Prompt** - Asks LLM to verify user-provided names:
   - Check if names appear in transcript
   - Validate order
   - Identify contradictions
   - Suggest corrections

**Response Format:** JSON with confidence scores and evidence.

---

#### 3. EnhancerContext Integration
**Location:** `contexts/EnhancerContext.tsx`

**New State:**
```typescript
isIdentifyingSpeakers: boolean;
speakerIdentificationResult: SpeakerIdentificationResult | null;
speakerIdentificationError: string | null;
```

**New Method:**
```typescript
identifySpeakersInTranscript(
  options: SpeakerIdentificationOptions
): Promise<SpeakerIdentificationResult>
```

**Implementation:**
- Reuses existing LLM worker (no additional model loading)
- Uses lower temperature (0.3) for consistent speaker detection
- 2-minute timeout for identification process
- Handles errors gracefully with fallback to generic labels

---

#### 4. Speaker Formatter Updates
**Location:** `utils/speakerFormatter.ts`

**Updated FormattingOptions:**
```typescript
interface FormattingOptions {
  includeTimestamps: boolean;
  includeSpeakerLabels: boolean;
  speakerDetectionSensitivity: 'low' | 'medium' | 'high';
  speakerNames?: Map<string, string>;  // NEW
}
```

**Updated Functions:**
- `formatTranscriptWithSpeakers()` - Uses `speakerNames` map if available
- `formatEnhancedTranscriptWithSpeakers()` - Applies names to enhanced text

**Behavior:**
- If `speakerNames` provided → Use identified names
- If not provided → Use generic labels ("Speaker 1", "Speaker 2")

---

#### 5. DoneStateView Integration
**Location:** `components/states/DoneStateView.tsx`

**New State:**
```typescript
const [speakerNames, setSpeakerNames] = useState<SpeakerNames>({
  mode: 'auto',
  useAIDetection: true,
});

const [isIdentifyingSpeakers, setIsIdentifyingSpeakers] = useState(false);
```

**Workflow:**
1. User completes transcription
2. `SpeakerIdentificationInput` component appears (when speaker labels enabled + model loaded)
3. User selects mode and provides names (optional)
4. **Auto-identification trigger:**
   - Runs automatically when AI detection enabled
   - Requires: speaker labels ON, model loaded, no existing identification
5. **Manual trigger:** User changes input → triggers re-identification
6. Results applied to `formattingOptions.speakerNames`
7. Transcript re-formatted with identified names
8. Summary shown with confidence scores and warnings

**UI Elements:**
- Input component (collapsible when not in use)
- Loading indicator during identification
- Success summary with statistics
- Warning display for validation issues

---

## User Workflows

### Workflow 1: Automatic Detection
**User Action:** Enable speaker labels, let AI detect automatically

1. Transcription completes
2. Enhancement enabled (model loads)
3. Speaker labels toggle ON
4. AI automatically identifies speakers from transcript
5. Names appear in formatted output (e.g., "John Smith", "Interviewer")

**Best For:** Single recordings where speakers introduce themselves

---

### Workflow 2: First Speaker Provided
**User Action:** Enter first speaker name

1. Transcription completes
2. User enters "John Smith" in first speaker field
3. AI:
   - Assigns "John Smith" to Speaker 1
   - Detects remaining speakers from context
   - Orders them by speaking turns
4. Output: "John Smith", "Mary Johnson", "Speaker 3" (if unidentified)

**Best For:** Interviews, meetings where you know the first speaker

---

### Workflow 3: All Speakers Provided
**User Action:** Enter all participant names

1. Transcription completes
2. User enters: "John Smith", "Mary Johnson", "Alex Brown"
3. AI validates:
   - Checks if names appear in transcript
   - Verifies order
   - Suggests corrections if needed
4. Output uses validated names with high confidence

**Best For:** Scheduled meetings, interviews where participants are known

**Validation Example:**
```
User Input: "Mary", "John"
Transcript mentions: "Maria" and "John"

AI Response:
✓ John - validated (confidence: 0.95)
⚠️ Mary - possible typo, suggests "Maria" (confidence: 0.6)
```

---

## AI Detection Techniques

### 1. Self-Introduction Detection
**Patterns:**
- "I'm [Name]"
- "This is [Name] speaking"
- "My name is [Name]"
- "[Name] here"

**Confidence:** 0.9-1.0 (very high)

### 2. Direct Address Detection
**Patterns:**
- "Thanks [Name]"
- "[Name], what do you think?"
- "As [Name] mentioned"

**Confidence:** 0.7-0.9 (high)

### 3. Role Indicator Detection
**Patterns:**
- "As the interviewer, I..."
- "Our guest today is..."
- "The host will..."

**Result:** Uses role as name ("Interviewer", "Guest", "Host")
**Confidence:** 0.6-0.8 (medium)

### 4. Context Inference
**Techniques:**
- Question-answer patterns (interviewer vs interviewee)
- Topic expertise (technical vs general)
- Conversation flow (moderator vs participants)

**Confidence:** 0.4-0.7 (lower but still useful)

### 5. Pattern Analysis
**Techniques:**
- Signature phrases ("you know", "actually", "basically")
- Speech tempo and pauses
- Conversational markers ("yeah", "okay", "well")

**Confidence:** 0.3-0.6 (supplementary)

---

## Confidence Scoring

**Confidence Levels:**
- **0.9-1.0:** Very confident (self-introduction, direct evidence)
- **0.7-0.9:** Likely correct (name mentioned multiple times, clear context)
- **0.5-0.7:** Possible (inferred from patterns, some ambiguity)
- **0.3-0.5:** Uncertain (weak signals, fallback detection)
- **<0.3:** Unknown (no reliable evidence, use generic label)

**Display:**
- High confidence (0.8+) → Show identified name
- Medium confidence (0.5-0.8) → Show name with validation warnings
- Low confidence (<0.5) → Use "Unknown" or "Speaker N"

---

## Error Handling

### Scenario 1: No Names Detected
**Cause:** No clear speaker indicators in transcript
**Fallback:** Use generic labels ("Speaker 1", "Speaker 2")
**User Impact:** Minimal - transcript still formatted correctly

### Scenario 2: User Input Contradicts Transcript
**Example:** User says "John" but transcript shows "Jonathan"
**AI Response:** Warning + suggestion
```
⚠️ User provided "John" but transcript mentions "Jonathan"
💡 Suggestion: Use "Jonathan" instead
```

### Scenario 3: Identification Timeout
**Cause:** Very long transcript or slow processing
**Fallback:** Return generic labels after 2 minutes
**User Impact:** Can retry or manually enter names

### Scenario 4: Model Not Loaded
**Cause:** User tries identification before model loads
**Behavior:** Disabled state, clear message
**Solution:** Wait for model load or trigger load automatically

---

## Performance Considerations

**Typical Identification Time:**
- Short transcript (< 1000 words): 5-15 seconds
- Medium transcript (1000-3000 words): 15-45 seconds
- Long transcript (3000+ words): 45-120 seconds

**Resource Usage:**
- Reuses existing LLM (no additional download)
- Lower temperature = faster generation
- Single request (not chunked)
- Minimal memory overhead

**Optimization:**
- Runs in background (non-blocking UI)
- Results cached until transcript changes
- Auto-trigger only when conditions met
- Manual trigger always available

---

## Future Enhancements

### Potential Improvements:

1. **Voice Characteristics** (requires audio analysis)
   - Pitch, tempo, accent detection
   - Link to actual speaker diarization

2. **Multi-Language Support**
   - Detect non-English name patterns
   - Handle transliterated names

3. **Learning from Corrections**
   - Remember user corrections
   - Improve future suggestions

4. **Meeting Context Integration**
   - Import from calendar invite
   - Pre-populate from meeting metadata

5. **Export with Names**
   - Speaker-specific exports
   - Individual speaker timelines
   - Per-speaker word clouds

6. **Confidence Visualization**
   - Color-code by confidence
   - Show evidence snippets
   - Interactive name editing

---

## Testing

### Manual Testing Checklist:

- [ ] Auto detection with self-introductions
- [ ] Auto detection with name mentions
- [ ] First speaker mode with known name
- [ ] First speaker mode with typo
- [ ] All speakers mode with correct names
- [ ] All speakers mode with wrong order
- [ ] Validation warnings display correctly
- [ ] Confidence scores accurate
- [ ] Generic labels fallback works
- [ ] Re-identification on input change
- [ ] Disabled state when model loading
- [ ] Loading indicator during identification
- [ ] Summary statistics display
- [ ] Integration with speaker formatting
- [ ] Integration with enhanced transcript

### Test Transcripts:

1. **Self-Introduction Test:**
   ```
   Speaker 1: Hi, I'm John Smith from the engineering team.
   Speaker 2: Thanks John. I'm Mary Johnson, the project lead.
   ```
   Expected: Identify "John Smith" and "Mary Johnson" with high confidence

2. **Name Mention Test:**
   ```
   Speaker 1: What do you think, Alex?
   Speaker 2: Good question. Sarah, can you weigh in?
   Speaker 3: Sure, I agree with Alex's point.
   ```
   Expected: Identify "Alex", "Sarah", map to correct speakers

3. **Role Indicator Test:**
   ```
   Interviewer: Welcome to the show. Let's start with...
   Guest: Thanks for having me. I'd like to discuss...
   ```
   Expected: Label as "Interviewer" and "Guest"

4. **No Clear Indicators Test:**
   ```
   Speaker 1: The weather is nice today.
   Speaker 2: Yes, very pleasant.
   ```
   Expected: Use generic labels, low confidence

---

## Technical Implementation Details

### State Flow:

```
User Input → SpeakerNames State → Speaker Identification Trigger
     ↓
EnhancerContext.identifySpeakersInTranscript()
     ↓
Build AI Prompt → Send to LLM Worker → Parse JSON Response
     ↓
SpeakerIdentificationResult → Update FormattingOptions
     ↓
formatTranscriptWithSpeakers() → Apply Speaker Names → Display
```

### Data Flow Diagram:

```
┌─────────────────────────────────────────────────────────────┐
│                     DoneStateView                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SpeakerIdentificationInput                          │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                 │  │
│  │  │  Auto  │  │ First  │  │  All   │                 │  │
│  │  │ Detect │  │Speaker │  │Speakers│                 │  │
│  │  └────────┘  └────────┘  └────────┘                 │  │
│  │         │         │           │                      │  │
│  │         └─────────┴───────────┘                      │  │
│  │                   │                                  │  │
│  │            onNamesChange()                           │  │
│  └────────────────────│──────────────────────────────────┘  │
│                       ↓                                      │
│           handleIdentifySpeakers()                           │
│                       ↓                                      │
└───────────────────────│──────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  EnhancerContext                             │
│                                                              │
│  identifySpeakersInTranscript()                             │
│         ↓                                                    │
│  initWorker() → LLM Generate Function                       │
│         ↓                                                    │
│  identifySpeakers() (utils/speakerIdentifier.ts)           │
│         ↓                                                    │
│  buildSpeakerDetectionPrompt()                              │
│         ↓                                                    │
│  LLM Worker → JSON Response                                 │
│         ↓                                                    │
│  parseSpeakerDetectionResponse()                            │
│         ↓                                                    │
│  SpeakerIdentificationResult                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  Back to DoneStateView                       │
│                                                              │
│  setFormattingOptions({ speakerNames: result.speakerMap })  │
│         ↓                                                    │
│  formatTranscriptWithSpeakers()                             │
│         ↓                                                    │
│  TabbedTranscriptionView (with speaker names)               │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
components/
  └── SpeakerIdentificationInput.tsx     # UI component
  └── states/
      └── DoneStateView.tsx              # Integration point

utils/
  └── speakerIdentifier.ts               # Core logic
  └── speakerFormatter.ts                # Updated to use speaker names

contexts/
  └── EnhancerContext.tsx                # LLM integration

types/
  └── audioSegment.ts                    # SpeakerTurn type (existing)
```

---

## Dependencies

- **LLM Integration:** Reuses `EnhancerContext` and WebLLM worker
- **Speaker Detection:** Builds on existing `speakerFormatter.ts` logic
- **UI Components:** Uses Lucide icons, Tailwind CSS
- **Type System:** TypeScript strict mode compatible

---

## Summary

This feature provides a sophisticated speaker identification system that:

✅ **Helps users** by automatically detecting speaker names
✅ **Validates** user input to prevent mistakes
✅ **Gracefully falls back** to generic labels when detection fails
✅ **Provides transparency** through confidence scores and warnings
✅ **Reuses existing infrastructure** (LLM, worker, formatting)
✅ **Enhances transcript quality** with personalized speaker labels

The system is designed to be **flexible**, **accurate**, and **user-friendly**, handling everything from fully automatic detection to manual input with AI validation.






