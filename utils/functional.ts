/**
 * Functional Utilities
 *
 * BEND-inspired functional composition primitives.
 * All functions are pure (no side effects) and composable.
 */

/**
 * Pipe: Left-to-right function composition (synchronous)
 *
 * @example
 * const process = pipe(trim, toLowerCase, split(' '));
 * process('  HELLO WORLD  '); // ['hello', 'world']
 */
export function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): (a: A) => D;
export function pipe<A, B, C, D, E>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E
): (a: A) => E;
export function pipe(...fns: Array<(arg: unknown) => unknown>): (arg: unknown) => unknown {
  return (value: unknown) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * AsyncPipe: Left-to-right function composition (async)
 * Handles both sync and async functions in the pipeline.
 *
 * @example
 * const process = asyncPipe(fetchData, parseJSON, validate);
 * await process(url);
 */
export function asyncPipe<A, B>(fn1: (a: A) => B | Promise<B>): (a: A) => Promise<B>;
export function asyncPipe<A, B, C>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>
): (a: A) => Promise<C>;
export function asyncPipe<A, B, C, D>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>
): (a: A) => Promise<D>;
export function asyncPipe<A, B, C, D, E>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>,
  fn4: (d: D) => E | Promise<E>
): (a: A) => Promise<E>;
export function asyncPipe(
  ...fns: Array<(arg: unknown) => unknown | Promise<unknown>>
): (arg: unknown) => Promise<unknown> {
  return async (value: unknown) => {
    let result = value;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * ParallelMap: Process items in parallel with concurrency control
 *
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Max concurrent operations (default: CPU cores)
 * @returns Promise resolving to array of results in original order
 *
 * @example
 * const results = await parallelMap(urls, fetchData, 4);
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array(workerCount)
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * Batch: Split array into chunks of specified size
 *
 * @example
 * batch([1,2,3,4,5], 2); // [[1,2], [3,4], [5]]
 */
export function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Identity: Returns input unchanged (useful in pipelines)
 */
export const identity = <T>(x: T): T => x;

/**
 * Tap: Execute side effect without changing value (for debugging)
 *
 * @example
 * pipe(process, tap(console.log), format);
 */
export const tap = <T>(fn: (x: T) => void) => (x: T): T => {
  fn(x);
  return x;
};
