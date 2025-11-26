"use client";

import { FileUploader } from "@/components/FileUploader";
import { PageHeader } from "@/components/PageHeader";

interface IdleStateViewProps {
  onFileSelect: (file: File | null) => void;
  isLoading: boolean;
  maxFileSize: number;
  recommendedFileSize: number;
}

/**
 * IDLE State View
 * Shows when user first arrives or after reset
 */
export function IdleStateView({
  onFileSelect,
  isLoading,
  maxFileSize,
  recommendedFileSize,
}: IdleStateViewProps) {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Main Title & Subtitle */}
      <PageHeader 
        subtitle="File Upload"
        description="Upload your video or audio file to begin processing. Everything runs locally in your browser."
        icon="📁"
      />

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-3xl font-bold text-white">1</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Upload Your File</h3>
          <p className="text-zinc-400">
            {isLoading
              ? "Initializing FFmpeg engine..."
              : "Drag and drop or click to select a video or audio file"}
          </p>
        </div>
        <FileUploader
          onFileSelect={onFileSelect}
          maxFileSize={maxFileSize}
          recommendedFileSize={recommendedFileSize}
        />
      </div>
    </div>
  );
}



