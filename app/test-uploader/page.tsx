"use client";

import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function TestUploaderPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    console.log("File selected:", file);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            FileUploader Component Test
          </h1>
          <p className="text-zinc-400">
            Testing drag-and-drop, file validation, and blob memory management
          </p>
        </header>

        {/* FileUploader Component */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload a File</h2>
          <FileUploader onFileSelect={handleFileSelect} />
        </div>

        {/* Selected File Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Selected File State
          </h2>
          
          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">File loaded in state</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-zinc-800 p-3 rounded">
                  <div className="text-zinc-500 mb-1">Name</div>
                  <div className="font-mono text-zinc-100">{selectedFile.name}</div>
                </div>
                
                <div className="bg-zinc-800 p-3 rounded">
                  <div className="text-zinc-500 mb-1">Size</div>
                  <div className="font-mono text-zinc-100">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                
                <div className="bg-zinc-800 p-3 rounded">
                  <div className="text-zinc-500 mb-1">Type</div>
                  <div className="font-mono text-zinc-100">{selectedFile.type}</div>
                </div>
                
                <div className="bg-zinc-800 p-3 rounded">
                  <div className="text-zinc-500 mb-1">Last Modified</div>
                  <div className="font-mono text-zinc-100">
                    {new Date(selectedFile.lastModified).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-950/30 border border-blue-800 rounded text-sm text-blue-300">
                ✅ File object is ready to pass to useFFmpeg hook for processing
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p>No file selected yet</p>
            </div>
          )}
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 bg-green-950/30 border border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-400">
            ✅ FileUploader Component Implemented
          </h3>
          <ul className="text-sm text-zinc-300 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Drag-and-drop:</strong> React hooks with visual feedback</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>File validation:</strong> MP4, MP3, WAV only</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Size limits:</strong> Max 100MB (reject), Warning &gt;50MB (env vars)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Video preview:</strong> Thumbnail via URL.createObjectURL</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Blob management:</strong> URLs tracked in ref, revoked on clear/unmount</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Clear button:</strong> Revokes blobs, frees memory, resets state</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span><strong>Styling:</strong> Tailwind with dark theme, blue accents, responsive</span>
            </li>
          </ul>
        </div>

        {/* Memory Management Info */}
        <div className="mt-6 bg-yellow-950/30 border border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">
            🛡️ Memory Management
          </h3>
          <p className="text-sm text-yellow-200 mb-3">
            The FileUploader component properly manages blob URLs to prevent memory leaks:
          </p>
          <ul className="text-xs text-yellow-300/80 space-y-1 list-disc list-inside">
            <li>All blob URLs are tracked in a ref array</li>
            <li>URLs are revoked when "Clear" button is clicked</li>
            <li>URLs are revoked when component unmounts</li>
            <li>File input is reset to allow re-uploading same file</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

