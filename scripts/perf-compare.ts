/**
 * Performance Comparison Script
 * 
 * Compares two benchmark JSON files and calculates improvement.
 */

import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  file: string;
  mode: 'standard' | 'fast';
  duration_ms: number;
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

interface ComparisonResult {
  before: BenchmarkRun;
  after: BenchmarkRun;
  perFile: Array<{
    file: string;
    before_ms: number;
    after_ms: number;
    improvement_percent: number;
  }>;
  overall: {
    before_median_ms: number;
    after_median_ms: number;
    improvement_percent: number;
    target_met: boolean;
  };
}

/**
 * Load benchmark JSON file
 */
function loadBenchmark(filePath: string): BenchmarkRun {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Benchmark file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Compare two benchmark runs
 */
function compareBenchmarks(before: BenchmarkRun, after: BenchmarkRun): ComparisonResult {
  // Group results by file
  const beforeByFile = new Map<string, BenchmarkResult[]>();
  const afterByFile = new Map<string, BenchmarkResult[]>();

  before.results.forEach(r => {
    if (!beforeByFile.has(r.file)) {
      beforeByFile.set(r.file, []);
    }
    beforeByFile.get(r.file)!.push(r);
  });

  after.results.forEach(r => {
    if (!afterByFile.has(r.file)) {
      afterByFile.set(r.file, []);
    }
    afterByFile.get(r.file)!.push(r);
  });

  // Calculate per-file improvements
  const perFile: ComparisonResult['perFile'] = [];
  
  for (const [file, beforeResults] of beforeByFile.entries()) {
    const afterResults = afterByFile.get(file);
    if (!afterResults) continue;

    const beforeStandard = beforeResults.find(r => r.mode === 'standard');
    const beforeFast = beforeResults.find(r => r.mode === 'fast');
    const afterStandard = afterResults.find(r => r.mode === 'standard');
    const afterFast = afterResults.find(r => r.mode === 'fast');

    if (beforeFast && afterFast) {
      const improvement = ((beforeFast.duration_ms - afterFast.duration_ms) / beforeFast.duration_ms) * 100;
      perFile.push({
        file,
        before_ms: beforeFast.duration_ms,
        after_ms: afterFast.duration_ms,
        improvement_percent: improvement,
      });
    }
  }

  // Calculate overall improvement
  const beforeMedian = before.summary.fast_median_ms;
  const afterMedian = after.summary.fast_median_ms;
  const improvement = ((beforeMedian - afterMedian) / beforeMedian) * 100;
  const targetMet = improvement >= 35;

  return {
    before,
    after,
    perFile,
    overall: {
      before_median_ms: beforeMedian,
      after_median_ms: afterMedian,
      improvement_percent: improvement,
      target_met,
    },
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: tsx scripts/perf-compare.ts <before.json> <after.json>');
    process.exit(1);
  }

  const [beforePath, afterPath] = args;

  try {
    const before = loadBenchmark(beforePath);
    const after = loadBenchmark(afterPath);

    const comparison = compareBenchmarks(before, after);

    console.log('\n=== Performance Comparison ===\n');
    console.log(`Before: ${before.label} (${before.timestamp})`);
    console.log(`After:  ${after.label} (${after.timestamp})\n`);

    console.log('Per-File Results:');
    comparison.perFile.forEach(({ file, before_ms, after_ms, improvement_percent }) => {
      const status = improvement_percent >= 35 ? '✅' : '❌';
      console.log(`  ${status} ${file}:`);
      console.log(`    Before: ${before_ms}ms`);
      console.log(`    After:  ${after_ms}ms`);
      console.log(`    Improvement: ${improvement_percent.toFixed(1)}%`);
    });

    console.log('\nOverall:');
    console.log(`  Before Median: ${comparison.overall.before_median_ms}ms`);
    console.log(`  After Median:  ${comparison.overall.after_median_ms}ms`);
    console.log(`  Improvement:   ${comparison.overall.improvement_percent.toFixed(1)}%`);
    console.log(`  Target Met (>=35%): ${comparison.overall.target_met ? '✅' : '❌'}`);

    // Save comparison
    const outputPath = path.join(process.cwd(), `comparison-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(comparison, null, 2));
    console.log(`\nComparison saved to: ${outputPath}`);

    // Exit with error code if target not met
    if (!comparison.overall.target_met) {
      console.error('\n❌ Performance target not met!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Comparison failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
