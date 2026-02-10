"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Upload, X, FileVideo, FileAudio, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/utils/cn";

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  className?: string;
  maxFileSize?: number; // in bytes - dynamic based on hardware
  recommendedFileSize?: number; // in bytes - warning threshold
}

// Default limits (fallback if not provided)
const DEFAULT_MAX_FILE_SIZE = 2048 * 1024 * 1024; // 2GB
const DEFAULT_RECOMMENDED_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Supported file types (including MKV)
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo", // AVI
  "video/x-matroska", // MKV
  "video/x-flv", // FLV
];
const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/mp4", // M4A
];
const ALL_SUPPORTED_TYPES = [...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_AUDIO_TYPES];

export function FileUploader({ 
  onFileSelect, 
  accept, 
  className,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  recommendedFileSize = DEFAULT_RECOMMENDED_FILE_SIZE,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  // Track blob URLs for cleanup - CRITICAL for memory management
  const blobUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file type and size
  const validateFile = useCallback((file: File): { valid: boolean; error?: string; warning?: string } => {
    // Check file type (MIME type)
    let isSupported = ALL_SUPPORTED_TYPES.includes(file.type);
    
    // Fallback: Check file extension if MIME type is not recognized
    if (!isSupported) {
      const ext = file.name.toLowerCase().split('.').pop();
      const supportedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'mp3', 'wav', 'ogg', 'aac', 'm4a'];
      isSupported = supportedExtensions.includes(ext || '');
    }
    
    if (!isSupported) {
      return {
        valid: false,
        error: `Unsupported file type. Supported: MP4, MKV, WebM, AVI, MOV, MP3, WAV, AAC, OGG`,
      };
    }

    // Check max file size (hard limit)
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxFileSize / 1024 / 1024}MB limit. Please choose a smaller file.`,
      };
    }

    // Check recommended file size (warning)
    if (file.size > recommendedFileSize) {
      return {
        valid: true,
        warning: `Warning: File size is ${(file.size / 1024 / 1024).toFixed(2)}MB. Files over ${recommendedFileSize / 1024 / 1024}MB may cause performance issues or browser crashes.`,
      };
    }

    return { valid: true };
  }, [maxFileSize, recommendedFileSize]);

  // Handle file selection
  const handleFile = useCallback(
    (selectedFile: File | null) => {
      // Clear previous state
      setError(null);
      setWarning(null);

      if (!selectedFile) {
        setFile(null);
        onFileSelect(null);
        return;
      }

      // Validate file
      const validation = validateFile(selectedFile);
      
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        setFile(null);
        onFileSelect(null);
        return;
      }

      // Set warning if file is large
      if (validation.warning) {
        setWarning(validation.warning);
      }

      // Set file
      setFile(selectedFile);
      onFileSelect(selectedFile);

      // Create preview for video files
      if (SUPPORTED_VIDEO_TYPES.includes(selectedFile.type)) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        
        // Track URL for cleanup - CRITICAL for memory management
        blobUrlsRef.current.push(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [onFileSelect, validateFile]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFile(droppedFiles[0]);
      }
    },
    [handleFile]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        handleFile(selectedFiles[0]);
      }
    },
    [handleFile]
  );

  // Clear file and revoke blob URLs - CRITICAL for memory management
  const handleClear = useCallback(() => {
    // Revoke all blob URLs to free memory
    blobUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current = [];

    // Clear state
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setWarning(null);
    onFileSelect(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFileSelect]);

  // Cleanup blob URLs on unmount - CRITICAL for memory management
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Check if file is video
  const isVideo = file && SUPPORTED_VIDEO_TYPES.includes(file.type);
  const isAudio = file && SUPPORTED_AUDIO_TYPES.includes(file.type);

  return (
    <div className={cn("w-full", className)}>
      {/* Drag and Drop Zone */}
      {!file && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-16 min-h-[400px] transition-all duration-200 cursor-pointer",
            "hover:border-blue-500 hover:bg-blue-950/20",
            isDragging
              ? "border-blue-500 bg-blue-950/30 scale-[1.02]"
              : "border-zinc-700 bg-zinc-900/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept || ".mp4,.mkv,.webm,.mov,.avi,.flv,.mp3,.wav,.ogg,.aac,.m4a"}
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-6 text-center h-full">
            <div
              className={cn(
                "p-6 rounded-full transition-colors",
                isDragging ? "bg-blue-500/20" : "bg-zinc-800"
              )}
            >
              <Upload
                className={cn(
                  "w-16 h-16 transition-colors",
                  isDragging ? "text-blue-400" : "text-zinc-400"
                )}
              />
            </div>

            <div>
              <p className="text-2xl font-semibold text-zinc-100 mb-3">
                {isDragging ? "Drop your file here" : "Drag & drop your file here"}
              </p>
              <p className="text-base text-zinc-400 mb-2">or click to browse</p>
              <p className="text-sm text-zinc-500">
                Supports MP4, MKV, WebM, AVI, MP3, WAV, AAC, OGG<br/>
                <span className="text-xs">(max <span suppressHydrationWarning>{Math.floor(maxFileSize / 1024 / 1024)}</span>MB)</span>
              </p>
            </div>

            {!isDragging && (
              <button
                type="button"
                className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-base"
              >
                Browse Files
              </button>
            )}
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="border-2 border-zinc-700 bg-zinc-900/50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            {/* Preview Thumbnail or Icon */}
            <div className="shrink-0">
              {isVideo && previewUrl ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-zinc-800">
                  <video
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <FileVideo className="absolute bottom-2 right-2 w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg bg-zinc-800 flex items-center justify-center">
                  {isAudio ? (
                    <FileAudio className="w-12 h-12 text-blue-400" />
                  ) : (
                    <FileVideo className="w-12 h-12 text-blue-400" />
                  )}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-100 truncate mb-1">
                    {file.name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {formatFileSize(file.size)} • {file.type.split("/")[1].toUpperCase()}
                  </p>
                </div>

                <button
                  onClick={handleClear}
                  className="shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
                  title="Clear file"
                >
                  <X className="w-5 h-5 text-zinc-400 group-hover:text-red-400" />
                </button>
              </div>

              {/* Success indicator */}
              {!warning && !error && (
                <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>File ready for processing</span>
                </div>
              )}

              {/* File size breakdown */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span suppressHydrationWarning>Max: {Math.floor(maxFileSize / 1024 / 1024)}MB</span>
                <span>•</span>
                <span suppressHydrationWarning>Recommended: &lt;{Math.floor(recommendedFileSize / 1024 / 1024)}MB</span>
              </div>
            </div>
          </div>

          {/* Warning message */}
          {warning && (
            <div className="mt-4 p-4 bg-yellow-950/30 border border-yellow-800 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-200 font-medium mb-1">Performance Warning</p>
                <p className="text-xs text-yellow-300/80">{warning}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-red-950/30 border border-red-800 rounded-lg flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-200 font-medium mb-1">File Error</p>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

