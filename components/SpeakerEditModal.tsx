"use client";

/**
 * Speaker Edit Modal
 * 
 * Simple modal for bulk editing all speaker names at once
 * Allows users to quickly update speaker identifications before re-enhancing
 */

import { useState, useEffect } from 'react';
import { X, Save, User, AlertCircle } from 'lucide-react';

interface SpeakerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpeakers: Map<string, string>; // label -> name mapping
  onSave: (updatedSpeakers: Map<string, string>) => void;
}

export function SpeakerEditModal({
  isOpen,
  onClose,
  currentSpeakers,
  onSave,
}: SpeakerEditModalProps) {
  const [editedSpeakers, setEditedSpeakers] = useState<Map<string, string>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited speakers when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditedSpeakers(new Map(currentSpeakers));
      setHasChanges(false);
    }
  }, [isOpen, currentSpeakers]);

  if (!isOpen) return null;

  const handleNameChange = (label: string, newName: string) => {
    const updated = new Map(editedSpeakers);
    updated.set(label, newName);
    setEditedSpeakers(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(editedSpeakers);
    onClose();
  };

  const handleReset = () => {
    setEditedSpeakers(new Map(currentSpeakers));
    setHasChanges(false);
  };

  const speakerEntries = Array.from(editedSpeakers.entries()).sort((a, b) => {
    // Sort by speaker number (Speaker 1, Speaker 2, etc.)
    const numA = parseInt(a[0].replace(/\D/g, ''));
    const numB = parseInt(b[0].replace(/\D/g, ''));
    return numA - numB;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-950/50 rounded-lg">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Edit Speaker Names</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Update speaker identifications before re-enhancing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="m-6 p-4 bg-blue-950/20 border border-blue-500/30 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-400/80">
                <li>Edit speaker names below</li>
                <li>Click "Save Changes" to apply</li>
                <li>Click "Re-enhance" to update the transcript with new names</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Speaker List */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-3">
          {speakerEntries.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No speakers detected yet</p>
              <p className="text-sm mt-1">Identify speakers first to edit their names</p>
            </div>
          ) : (
            speakerEntries.map(([label, name]) => (
              <div
                key={label}
                className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-purple-500/30 transition-colors"
              >
                {/* Speaker Label */}
                <div className="flex-shrink-0 w-24">
                  <div className="text-xs text-zinc-500 font-medium mb-1">Label</div>
                  <div className="text-sm font-mono text-zinc-300">{label}</div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-zinc-600">→</div>

                {/* Name Input */}
                <div className="flex-1">
                  <div className="text-xs text-zinc-500 font-medium mb-1">Name</div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(label, e.target.value)}
                    placeholder={`Enter name for ${label}`}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Status Indicator */}
                {name !== currentSpeakers.get(label) && (
                  <div className="flex-shrink-0">
                    <span className="text-xs text-amber-400 font-medium">Modified</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            {hasChanges ? (
              <>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span>Unsaved changes</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>No changes</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


