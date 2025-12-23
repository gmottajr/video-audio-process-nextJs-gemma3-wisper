"use client";

/**
 * Editable Transcript Component
 * 
 * Allows inline editing of speaker names directly in the transcript
 * Users can click on speaker labels to edit them
 */

import { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableTranscriptProps {
  transcript: string;
  onSpeakerNameChange?: (oldName: string, newName: string) => void;
  className?: string;
}

export function EditableTranscript({
  transcript,
  onSpeakerNameChange,
  className = '',
}: EditableTranscriptProps) {
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingLabel]);

  // Parse transcript and find speaker labels
  // Format: **SpeakerName**: text or [timestamp] **SpeakerName**: text
  const renderTranscript = () => {
    const lines = transcript.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, lineIdx) => {
      if (!line.trim()) {
        elements.push(<br key={`br-${lineIdx}`} />);
        return;
      }

      // Match speaker label pattern: **Name**:
      const speakerMatch = line.match(/^(\[[\d:]+\]\s*)?\*\*([^*]+)\*\*:\s*(.*)$/);
      
      if (speakerMatch) {
        const timestamp = speakerMatch[1] || '';
        const speakerName = speakerMatch[2];
        const text = speakerMatch[3];
        const isEditing = editingLabel === `${lineIdx}-${speakerName}`;

        elements.push(
          <div key={`line-${lineIdx}`} className="mb-4">
            {/* Timestamp */}
            {timestamp && (
              <span className="text-zinc-500 text-sm font-mono mr-2">
                {timestamp.trim()}
              </span>
            )}

            {/* Editable Speaker Label */}
            {isEditing ? (
              <span className="inline-flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(speakerName);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="px-2 py-1 bg-zinc-800 border border-purple-500 rounded text-sm text-purple-300 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ width: `${Math.max(editValue.length, 10)}ch` }}
                />
                <button
                  onClick={() => handleSaveEdit(speakerName)}
                  className="p-1 hover:bg-green-950/50 rounded text-green-400 transition-colors"
                  title="Save (Enter)"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-red-950/50 rounded text-red-400 transition-colors"
                  title="Cancel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ) : (
              <button
                onClick={() => handleStartEdit(lineIdx, speakerName)}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-950/30 transition-colors"
              >
                <span className="text-purple-400 font-bold">
                  {speakerName}
                </span>
                <Edit2 className="w-3 h-3 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            
            <span className="text-purple-400 font-bold">: </span>

            {/* Text */}
            <span className="text-zinc-200 leading-relaxed">
              {text}
            </span>
          </div>
        );
      } else {
        // No speaker label, just render as plain text
        elements.push(
          <div key={`line-${lineIdx}`} className="mb-4 text-zinc-200 leading-relaxed">
            {line}
          </div>
        );
      }
    });

    return elements;
  };

  const handleStartEdit = (lineIdx: number, speakerName: string) => {
    setEditingLabel(`${lineIdx}-${speakerName}`);
    setEditValue(speakerName);
  };

  const handleSaveEdit = (oldName: string) => {
    if (editValue.trim() && editValue !== oldName) {
      onSpeakerNameChange?.(oldName, editValue.trim());
    }
    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setEditValue('');
  };

  return (
    <div className={`whitespace-pre-wrap font-mono text-sm ${className}`}>
      {renderTranscript()}
    </div>
  );
}


