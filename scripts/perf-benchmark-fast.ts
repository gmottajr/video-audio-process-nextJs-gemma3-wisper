/**
 * Performance Benchmark Script for Fast Mode
 * 
 * Runs transcription benchmarks comparing Standard vs Fast Mode.
 * Outputs JSON results for comparison.
 */

import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  file: string;
  mode: 'standard' | 'fast';
  duration_ms: number;
  chunks?: number;
  workers?: number;
  timestamp: string;
}

interface BenchmarkRun {
  label: string;
  timestamp: string;
  results: BenchmarkResult[];
  summary: {
    standard_median_ms: number;
    fast_median_ms: number;
    improvement_percent: number;
    target_met: boolean;
  };
}

/**
 * Run benchmark for a single file and mode
 */
async function benchmarkFile(
  filePath: string,
  mode: 'standard' | 'fast'
): Promise<BenchmarkResult> {
  // This would integrate with actual transcription pipeline
  // For now, this is a placeholder structure
  
  const startTime = Date.now();
  
  // TODO: Integrate with actual transcription
  // - Load file
  // - Run transcription in specified mode
  // - Measure time
  
  const duration_ms = Date.now() - startTime;
  
  return {
    file: path.basename(filePath),
    mode,
    duration_ms,
    chunks: mode === 'fast' ? undefined : undefined,
    workers: mode === 'fast' ? 2 : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run full benchmark suite
 */
async function runBenchmark(label: string): Promise<BenchmarkRun> {
  const testFixturesDir = path.join(process.cwd(), 'test-fixtures', 'audio');
  
  // Check if fixtures directory exists
  if (!fs.existsSync(testFixturesDir)) {
    console.error(`Test fixtures directory not found: ${testFixturesDir}`);
    console.error('Please create test fixtures first (see test-fixtures/README.md)');
    process.exit(1);
  }

  const files = fs.readdirSync(testFixturesDir)
    .filter(f => f.endsWith('.wav') || f.endsWith('.mp4'))
    .map(f => path.join(testFixturesDir, f));

  if (files.length === 0) {
    console.error('No test fixture files found');
    process.exit(1);
  }

  console.log(`Running benchmark: ${label}`);
  console.log(`Found ${files.length} test files`);

  const results: BenchmarkResult[] = [];

  // Run Standard Mode benchmarks
  console.log('\n=== Standard Mode ===');
  for (const file of files) {
    console.log(`Processing ${path.basename(file)}...`);
    const result = await benchmarkFile(file, 'standard');
    results.push(result);
    console.log(`  Completed in ${result.duration_ms}ms`);
  }

  // Run Fast Mode benchmarks
  console.log('\n=== Fast Mode ===');
  for (const file of files) {
    console.log(`Processing ${path.basename(file)}...`);
    const result = await benchmarkFile(file, 'fast');
    results.push(result);
    console.log(`  Completed in ${result.duration_ms}ms`);
  }

  // Calculate summary
  const standardResults = results.filter(r => r.mode === 'standard');
  const fastResults = results.filter(r => r.mode === 'fast');

  const standardMedian = calculateMedian(standardResults.map(r => r.duration_ms));
  const fastMedian = calculateMedian(fastResults.map(r => r.duration_ms));
  const improvement = ((standardMedian - fastMedian) / standardMedian) * 100;
  const targetMet = improvement >= 35;

  const summary: BenchmarkRun = {
    label,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      standard_median_ms: standardMedian,
      fast_median_ms: fastMedian,
      improvement_percent: improvement,
      target_met: targetMet,
    },
  };

  return summary;
}

/**
 * Calculate median of array
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const label = args.find(arg => arg.startsWith('--label='))?.split('=')[1] || 'benchmark';

  try {
    const benchmark = await runBenchmark(label);

    // Output results
    const outputPath = path.join(process.cwd(), `benchmark-${label}-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(benchmark, null, 2));

    console.log('\n=== Benchmark Complete ===');
    console.log(`Results saved to: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  Standard Mode Median: ${benchmark.summary.standard_median_ms}ms`);
    console.log(`  Fast Mode Median: ${benchmark.summary.fast_median_ms}ms`);
    console.log(`  Improvement: ${benchmark.summary.improvement_percent.toFixed(1)}%`);
    console.log(`  Target Met (>=35%): ${benchmark.summary.target_met ? '✅' : '❌'}`);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
