import { useState, useEffect, useCallback } from 'react';

export function useEditableEnhancedText(
  enhancedText: string,
  onEnhancedTextChange?: (text: string) => void
) {
  const [editedText, setEditedText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const currentEnhancedText = editedText ?? enhancedText;
  const hasEdits = editedText !== null && editedText !== enhancedText;

  // Reset edits when the source text changes (new enhancement arrived)
  useEffect(() => {
    setEditedText(null);
    setIsEditing(false);
  }, [enhancedText]);

  const handleTextEdit = useCallback(
    (newText: string) => {
      setEditedText(newText);
      onEnhancedTextChange?.(newText);
    },
    [onEnhancedTextChange]
  );

  const handleResetEdits = useCallback(() => {
    setEditedText(null);
    setIsEditing(false);
  }, []);

  return {
    currentEnhancedText,
    hasEdits,
    isEditing,
    setIsEditing,
    handleTextEdit,
    handleResetEdits,
  };
}
