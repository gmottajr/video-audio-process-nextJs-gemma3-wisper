"use client";

import React from "react";
import { X, Clock, MemoryStick, FileText, Zap, TrendingUp, Award, Download, FileDown } from "lucide-react";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { ModelKey } from "@/components/ModelSelector";
import { formatFileSize, estimateRAMUsage, estimateProcessingTime } from "@/utils/resourceEstimation";

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProcessingResult;
  file: File;
  modelKey?: ModelKey;
  startTime?: number;
  endTime?: number;
  peakMemoryMB?: number;
}

export function StatisticsModal({
  isOpen,
  onClose,
  result,
  file,
  modelKey,
  startTime,
  endTime,
  peakMemoryMB,
}: StatisticsModalProps) {
  console.log('[StatisticsModal] Render - isOpen:', isOpen, 'result:', result?.type, 'startTime:', startTime, 'endTime:', endTime);
  
  if (!isOpen) return null;
  
  console.log('[StatisticsModal] Modal is open, rendering content');

  // Calculate metrics
  const totalTimeMs = startTime && endTime ? endTime - startTime : 0;
  const totalTimeSec = totalTimeMs / 1000;
  const totalTimeMin = totalTimeSec / 60;
  
  // Get actual AI processing time from transcription result (if available)
  const aiProcessingTimeMs = result.transcription?.processingTime || 0;
  const aiProcessingTimeSec = aiProcessingTimeMs / 1000;
  const aiProcessingTimeMin = aiProcessingTimeSec / 60;
  
  // Use AI processing time for speed calculations if available, otherwise use total time
  const processingTimeMin = aiProcessingTimeMs > 0 ? aiProcessingTimeMin : totalTimeMin;

  const fileSizeMB = file.size / (1024 * 1024);
  const processingSpeedMBPerMin = processingTimeMin > 0 ? fileSizeMB / processingTimeMin : 0;

  const outputSize = result.blobUrl ? 0 : 0; // We'd need to fetch blob size
  const compressionRatio = outputSize > 0 ? file.size / outputSize : 0;

  // Transcription metrics
  const transcription = result.transcription;
  const wordCount = transcription?.text ? transcription.text.split(/\s+/).length : 0;
  const charCount = transcription?.text ? transcription.text.length : 0;
  const segmentCount = transcription?.chunks ? transcription.chunks.length : 0;
  const transcriptionSpeedWPM = processingTimeMin > 0 ? wordCount / processingTimeMin : 0;

  // Estimated vs Actual
  const estimatedRAM = modelKey ? estimateRAMUsage(file.size, modelKey) : 0;
  const actualRAMGB = peakMemoryMB ? peakMemoryMB / 1024 : 0;
  const ramAccuracy = estimatedRAM > 0 && actualRAMGB > 0 
    ? 100 - Math.abs(estimatedRAM - actualRAMGB) / estimatedRAM * 100 
    : 0;

  const estimatedTimeStr = modelKey ? estimateProcessingTime(file.size, modelKey) : "";
  
  // Performance grade
  const getPerformanceGrade = (): { grade: string; color: string; description: string } => {
    if (processingSpeedMBPerMin >= 30) return { grade: "A+", color: "text-green-400", description: "Exceptional" };
    if (processingSpeedMBPerMin >= 25) return { grade: "A", color: "text-green-400", description: "Excellent" };
    if (processingSpeedMBPerMin >= 20) return { grade: "B", color: "text-blue-400", description: "Good" };
    if (processingSpeedMBPerMin >= 15) return { grade: "C", color: "text-yellow-400", description: "Average" };
    return { grade: "D", color: "text-orange-400", description: "Slow" };
  };

  const performanceGrade = getPerformanceGrade();

  // Format time helper
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Helper to sanitize filename for export
  const sanitizeFilename = (name: string): string => 
    name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');

  // Helper to download a blob
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Collect all stats data into a structured object
  const collectStatsData = () => ({
    generatedAt: new Date().toISOString(),
    file: {
      name: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      sizeMB: fileSizeMB,
    },
    performance: {
      grade: performanceGrade.grade,
      description: performanceGrade.description,
      processingSpeedMBPerMin: Number(processingSpeedMBPerMin.toFixed(2)),
    },
    timing: {
      aiProcessingTimeMs,
      aiProcessingTimeSec: Number(aiProcessingTimeSec.toFixed(2)),
      aiProcessingTimeFormatted: aiProcessingTimeMs > 0 ? formatTime(aiProcessingTimeMs) : null,
      totalTimeMs,
      totalTimeSec: Number(totalTimeSec.toFixed(2)),
      totalTimeFormatted: totalTimeMs > 0 ? formatTime(totalTimeMs) : null,
      estimatedTime: estimatedTimeStr || null,
      startTime: startTime ? new Date(startTime).toISOString() : null,
      endTime: endTime ? new Date(endTime).toISOString() : null,
    },
    memory: {
      peakMemoryMB: peakMemoryMB || null,
      peakMemoryGB: actualRAMGB > 0 ? Number(actualRAMGB.toFixed(2)) : null,
      estimatedRAMGB: estimatedRAM > 0 ? estimatedRAM : null,
      accuracyPercent: ramAccuracy > 0 ? Number(ramAccuracy.toFixed(0)) : null,
    },
    transcription: transcription ? {
      wordCount,
      characterCount: charCount,
      segmentCount,
      wordsPerMinute: Math.round(transcriptionSpeedWPM),
    } : null,
    configuration: {
      model: modelKey || null,
      modelName: modelKey 
        ? (modelKey === 'distil-small' ? 'Distil-Whisper Small' : `Whisper ${modelKey.charAt(0).toUpperCase() + modelKey.slice(1)}`)
        : null,
      fastMode: result.metadata?.fastMode || false,
      workersUsed: result.metadata?.workersUsed || 1,
      enhancements: {
        compressionType: result.metadata?.compressionType || 'none',
        normalized: result.metadata?.normalized || false,
      },
    },
    processingType: result.type,
    processingTypeLabel: result.type === 'transcription' ? 'AI Transcription' : result.type === 'audio' ? 'Audio Extraction' : 'Video Conversion',
  });

  // Generate markdown report
  const generateMarkdownReport = (data: ReturnType<typeof collectStatsData>): string => {
    const lines: string[] = [
      '# Processing Statistics Report',
      '',
      `**Generated:** ${new Date(data.generatedAt).toLocaleString()}`,
      `**File:** ${data.file.name}`,
      `**Size:** ${data.file.sizeFormatted}`,
      `**Type:** ${data.processingTypeLabel}`,
      '',
    ];

    // Performance Grade
    if (data.timing.aiProcessingTimeMs > 0 || data.timing.totalTimeMs > 0) {
      lines.push(
        '## Performance',
        '',
        `**Grade:** ${data.performance.grade} (${data.performance.description})`,
        `**Speed:** ${data.performance.processingSpeedMBPerMin} MB/min`,
        ''
      );
    }

    // Timing
    lines.push('## Timing', '');
    if (data.timing.aiProcessingTimeFormatted) {
      lines.push(`- **AI Processing Time:** ${data.timing.aiProcessingTimeFormatted}`);
    }
    if (data.timing.totalTimeFormatted) {
      lines.push(`- **Total Time:** ${data.timing.totalTimeFormatted}`);
    }
    if (data.timing.estimatedTime) {
      lines.push(`- **Estimated:** ${data.timing.estimatedTime}`);
    }
    if (data.timing.startTime) {
      lines.push(`- **Started:** ${new Date(data.timing.startTime).toLocaleString()}`);
    }
    if (data.timing.endTime) {
      lines.push(`- **Completed:** ${new Date(data.timing.endTime).toLocaleString()}`);
    }
    lines.push('');

    // Memory
    if (data.memory.peakMemoryGB) {
      lines.push(
        '## Memory Usage',
        '',
        `- **Peak Memory:** ${data.memory.peakMemoryGB} GB`,
      );
      if (data.memory.estimatedRAMGB) {
        lines.push(`- **Estimated:** ${data.memory.estimatedRAMGB} GB`);
      }
      if (data.memory.accuracyPercent) {
        lines.push(`- **Estimation Accuracy:** ${data.memory.accuracyPercent}%`);
      }
      lines.push('');
    }

    // Transcription Metrics
    if (data.transcription) {
      lines.push(
        '## Transcription Metrics',
        '',
        `- **Words:** ${data.transcription.wordCount.toLocaleString()}`,
        `- **Characters:** ${data.transcription.characterCount.toLocaleString()}`,
        `- **Segments:** ${data.transcription.segmentCount}`,
        `- **Speed:** ${data.transcription.wordsPerMinute} words/min`,
        ''
      );
    }

    // Configuration
    lines.push('## Configuration', '');
    if (data.configuration.modelName) {
      lines.push(`- **Model:** ${data.configuration.modelName}`);
    }
    lines.push(`- **Mode:** ${data.configuration.fastMode ? 'Fast Mode' : 'Standard Mode'}`);
    if (data.configuration.fastMode && data.configuration.workersUsed > 1) {
      lines.push(`- **Workers:** ${data.configuration.workersUsed} (Parallel)`);
    }
    
    // Enhancements
    const enhancements: string[] = [];
    if (data.configuration.enhancements.compressionType !== 'none') {
      const compLabel = data.configuration.enhancements.compressionType === 'speech' ? 'Speech Compression' :
                        data.configuration.enhancements.compressionType === 'studio' ? 'Studio Compression' : 'Both Compressions';
      enhancements.push(compLabel);
    }
    if (data.configuration.enhancements.normalized) {
      enhancements.push('Normalized');
    }
    lines.push(`- **Audio Enhancements:** ${enhancements.length > 0 ? enhancements.join(', ') : 'None'}`);
    lines.push('');

    lines.push('---', '', '*Generated by Neural Groove Spectrum Divergent*');

    return lines.join('\n');
  };

  // Export as JSON
  const exportAsJSON = (): void => {
    const data = collectStatsData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `stats-${sanitizeFilename(file.name)}.json`);
  };

  // Export as Markdown
  const exportAsMarkdown = (): void => {
    const data = collectStatsData();
    const markdown = generateMarkdownReport(data);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadBlob(blob, `stats-${sanitizeFilename(file.name)}.md`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-2 border-zinc-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-zinc-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Processing Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close statistics"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-168px)]">
          {/* Performance Grade */}
          {(aiProcessingTimeMs > 0 || totalTimeMs > 0) && (
            <div className="mb-6 p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-bold text-zinc-100">Performance Grade</h3>
                  </div>
                  <p className="text-sm text-zinc-400">{performanceGrade.description} processing speed</p>
                </div>
                <div className={`text-6xl font-bold ${performanceGrade.color}`}>
                  {performanceGrade.grade}
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                {processingSpeedMBPerMin.toFixed(1)} MB/min • {transcriptionSpeedWPM > 0 ? `${Math.round(transcriptionSpeedWPM)} words/min` : 'N/A'}
                {aiProcessingTimeMs > 0 && <span className="ml-2 text-green-400">• Based on AI inference time</span>}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* AI Processing Time (Actual Inference) */}
            {aiProcessingTimeMs > 0 && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-zinc-300">AI Processing Time</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{formatTime(aiProcessingTimeMs)}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Actual transcription inference time
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {processingSpeedMBPerMin.toFixed(2)} MB/min
                </p>
              </div>
            )}
            
            {/* Total Time (includes overhead) */}
            {totalTimeMs > 0 && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-zinc-300">Total Time</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{formatTime(totalTimeMs)}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Includes audio decoding & overhead
                </p>
                {estimatedTimeStr && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Estimated: {estimatedTimeStr}
                  </p>
                )}
              </div>
            )}

            {/* Memory Usage */}
            {peakMemoryMB && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MemoryStick className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-zinc-300">Peak Memory Usage</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{(peakMemoryMB / 1024).toFixed(1)} GB</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {(peakMemoryMB / fileSizeMB).toFixed(1)}x file size
                </p>
                {estimatedRAM > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Estimated: {estimatedRAM}GB ({ramAccuracy > 0 ? `${ramAccuracy.toFixed(0)}% accurate` : 'N/A'})
                  </p>
                )}
              </div>
            )}

            {/* File Size */}
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-zinc-300">File Size</h3>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{formatFileSize(file.size)}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Input: {file.name}
              </p>
            </div>

            {/* Processing Speed */}
            {processingTimeMin > 0 && (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-zinc-300">Processing Speed</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-100">{processingSpeedMBPerMin.toFixed(1)}</p>
                <p className="text-xs text-zinc-500 mt-1">MB per minute</p>
              </div>
            )}
          </div>

          {/* Transcription Metrics */}
          {transcription && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-zinc-100 mb-3">📝 Transcription Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Words</p>
                  <p className="text-xl font-bold text-zinc-100">{wordCount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Characters</p>
                  <p className="text-xl font-bold text-zinc-100">{charCount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Segments</p>
                  <p className="text-xl font-bold text-zinc-100">{segmentCount}</p>
                </div>
                {processingTimeMin > 0 && (
                  <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg">
                    <p className="text-xs text-zinc-400 mb-1">Speed</p>
                    <p className="text-xl font-bold text-zinc-100">{Math.round(transcriptionSpeedWPM)}</p>
                    <p className="text-xs text-zinc-500">words/min</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Enhancements */}
          {(result.metadata?.compressionType || result.metadata?.normalized) && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-zinc-100 mb-3">🎚️ Audio Enhancements</h3>
              <div className="flex flex-wrap gap-2">
                {result.metadata.compressionType && result.metadata.compressionType !== 'none' && (
                  <span className="px-3 py-1.5 bg-green-950/50 border border-green-500/30 text-green-300 rounded-full text-sm">
                    {result.metadata.compressionType === 'speech' ? '🎙️ Speech Compressed' :
                     result.metadata.compressionType === 'studio' ? '🎚️ Studio Compressed' :
                     '🎛️ Both Compressions'}
                  </span>
                )}
                {result.metadata.normalized && (
                  <span className="px-3 py-1.5 bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-full text-sm">
                    🎵 Normalized
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Model Information */}
          {modelKey && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-zinc-100 mb-3">🤖 AI Model & Configuration</h3>
              <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold">
                      {modelKey === 'distil-small' ? 'Distil-Whisper Small' : `Whisper ${modelKey.charAt(0).toUpperCase() + modelKey.slice(1)}`}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    State-of-the-art speech recognition by OpenAI
                  </p>
                </div>
                
                {/* Fast Mode Indicator */}
                {result.metadata?.fastMode && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-amber-950/50 to-orange-950/50 border border-amber-500/30 text-amber-300 rounded-full text-sm font-semibold">
                      ⚡ Fast Mode
                    </span>
                    {result.metadata.workersUsed && result.metadata.workersUsed > 1 && (
                      <span className="px-3 py-1.5 bg-purple-950/50 border border-purple-500/30 text-purple-300 rounded-full text-sm">
                        {result.metadata.workersUsed} Workers (Parallel)
                      </span>
                    )}
                  </div>
                )}
                
                {/* Standard Mode Indicator */}
                {!result.metadata?.fastMode && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                    <span className="px-3 py-1.5 bg-blue-950/50 border border-blue-500/30 text-blue-300 rounded-full text-sm">
                      🎯 Standard Mode
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Details */}
          <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded-lg">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">📋 Processing Details</h3>
            <div className="space-y-1 text-xs text-zinc-400">
              <p>• File: {file.name}</p>
              <p>• Type: {result.type === 'transcription' ? 'AI Transcription' : result.type === 'audio' ? 'Audio Extraction' : 'Video Conversion'}</p>
              {result.metadata?.format && <p>• Format: {result.metadata.format}</p>}
              {startTime && <p>• Started: {new Date(startTime).toLocaleTimeString()}</p>}
              {endTime && <p>• Completed: {new Date(endTime).toLocaleTimeString()}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-700 p-4 bg-zinc-900/50 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={exportAsJSON}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
              aria-label="Export statistics as JSON"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={exportAsMarkdown}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
              aria-label="Export statistics as Markdown"
            >
              <FileDown className="w-4 h-4" />
              Export MD
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-sm transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


