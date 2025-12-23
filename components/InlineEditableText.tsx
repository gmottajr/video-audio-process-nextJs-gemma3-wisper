"use client";

/**
 * Inline Editable Text Component
 * 
 * JIRA-style inline editing:
 * - Click on text to enter edit mode
 * - Press Enter to save
 * - Press Escape to cancel
 * - Click outside to save
 */

import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface InlineEditableTextProps {
  text: string;
  onSave: (newText: string) => void;
  className?: string;
  editClassName?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function InlineEditableText({
  text,
  onSave,
  className,
  editClassName,
  placeholder = "Enter text...",
  multiline = true,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Handle click outside to save
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (divRef.current && !divRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editValue]);

  const handleStartEdit = () => {
    setEditValue(text);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() !== text.trim()) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      // Ctrl+Enter to save in multiline mode
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div ref={divRef} className="relative">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={multiline ? 10 : 1}
          className={cn(
            "w-full px-3 py-2 bg-zinc-800 border-2 border-purple-500 rounded-lg",
            "text-zinc-100 font-mono text-sm leading-relaxed",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
            "resize-y",
            editClassName
          )}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
            title="Save (Ctrl+Enter)"
          >
            <Check className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <span className="text-xs text-zinc-500 ml-2">
            {multiline ? "Ctrl+Enter to save • Esc to cancel" : "Enter to save • Esc to cancel"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleStartEdit}
      className={cn(
        "relative cursor-pointer group transition-all",
        "hover:bg-purple-950/20 hover:border-purple-500/30 rounded-lg p-2 -m-2",
        className
      )}
    >
      <p className="leading-relaxed whitespace-pre-wrap font-mono text-sm text-zinc-100">
        {text || <span className="text-zinc-500 italic">{placeholder}</span>}
      </p>
      {isHovered && (
        <div className="absolute top-2 right-2 p-1.5 bg-purple-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit2 className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * Inline Editable Speaker Name
 * Specialized version for editing speaker names in transcript
 */
interface InlineEditableSpeakerProps {
  speakerLabel: string; // e.g., "Speaker 1"
  speakerName: string; // e.g., "John"
  onSave: (label: string, newName: string) => void;
  className?: string;
}

export function InlineEditableSpeaker({
  speakerLabel,
  speakerName,
  onSave,
  className,
}: InlineEditableSpeakerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(speakerName);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle click outside to save
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (divRef.current && !divRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editValue]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(speakerName);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== speakerName) {
      onSave(speakerLabel, trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(speakerName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div ref={divRef} className="inline-flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "px-2 py-1 bg-zinc-800 border-2 border-purple-500 rounded",
            "text-zinc-100 font-bold text-sm",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
            "min-w-[120px]",
            className
          )}
        />
        <button
          onClick={handleSave}
          className="p-1 bg-green-600 hover:bg-green-700 rounded transition-colors"
          title="Save (Enter)"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
          title="Cancel (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <span
      ref={divRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleStartEdit}
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer group",
        "hover:bg-purple-950/30 hover:border-purple-500/50 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5",
        "transition-all",
        className
      )}
    >
      <span className="font-bold text-zinc-100">{speakerName}</span>
      {isHovered && (
        <Edit2 className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </span>
  );
}

