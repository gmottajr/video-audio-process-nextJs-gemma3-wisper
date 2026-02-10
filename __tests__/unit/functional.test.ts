/**
 * Tests for utils/functional.ts
 */
import {
  pipe,
  asyncPipe,
  parallelMap,
  batch,
  identity,
  tap,
} from '@/utils/functional';

describe('functional utilities', () => {
  describe('pipe', () => {
    it('should compose functions left-to-right', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const toString = (x: number) => x.toString();

      const pipeline = pipe(add1, double, toString);

      expect(pipeline(5)).toBe('12'); // (5+1)*2 = 12
    });

    it('should work with single function', () => {
      const add1 = (x: number) => x + 1;
      const pipeline = pipe(add1);

      expect(pipeline(5)).toBe(6);
    });

    it('should work with string transformations', () => {
      const trim = (s: string) => s.trim();
      const lower = (s: string) => s.toLowerCase();
      const split = (s: string) => s.split(' ');

      const pipeline = pipe(trim, lower, split);

      expect(pipeline('  HELLO WORLD  ')).toEqual(['hello', 'world']);
    });
  });

  describe('asyncPipe', () => {
    it('should compose async functions', async () => {
      const fetchValue = async (x: number) => x + 1;
      const processValue = async (x: number) => x * 2;

      const pipeline = asyncPipe(fetchValue, processValue);

      expect(await pipeline(5)).toBe(12);
    });

    it('should handle mixed sync/async functions', async () => {
      const syncAdd = (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;

      const pipeline = asyncPipe(syncAdd, asyncDouble);

      expect(await pipeline(5)).toBe(12);
    });

    it('should propagate errors', async () => {
      const fail = async () => {
        throw new Error('test error');
      };
      const pipeline = asyncPipe(fail);

      await expect(pipeline(5)).rejects.toThrow('test error');
    });
  });

  describe('parallelMap', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const double = async (x: number) => x * 2;

      const results = await parallelMap(items, double, 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should maintain order regardless of completion time', async () => {
      const items = [100, 50, 10];
      const delayedReturn = async (ms: number) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        return ms;
      };

      const results = await parallelMap(items, delayedReturn, 3);

      expect(results).toEqual([100, 50, 10]);
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const trackConcurrency = async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
        return x;
      };

      await parallelMap([1, 2, 3, 4, 5, 6], trackConcurrency, 2);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle empty array', async () => {
      const results = await parallelMap([], async (x) => x, 4);
      expect(results).toEqual([]);
    });

    it('should pass index to function', async () => {
      const items = ['a', 'b', 'c'];
      const withIndex = async (item: string, index: number) => `${item}${index}`;

      const results = await parallelMap(items, withIndex, 2);

      expect(results).toEqual(['a0', 'b1', 'c2']);
    });
  });

  describe('batch', () => {
    it('should split array into chunks', () => {
      expect(batch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle exact divisions', () => {
      expect(batch([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('should handle empty array', () => {
      expect(batch([], 2)).toEqual([]);
    });

    it('should handle size larger than array', () => {
      expect(batch([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('identity', () => {
    it('should return input unchanged', () => {
      expect(identity(5)).toBe(5);
      expect(identity('hello')).toBe('hello');
      expect(identity(null)).toBe(null);
    });
  });

  describe('tap', () => {
    it('should execute side effect and return value', () => {
      const sideEffect = jest.fn();
      const tapped = tap(sideEffect);

      const result = tapped(5);

      expect(result).toBe(5);
      expect(sideEffect).toHaveBeenCalledWith(5);
    });

    it('should work in pipeline', () => {
      const log: number[] = [];
      const pipeline = pipe(
        (x: number) => x + 1,
        tap((x) => log.push(x)),
        (x: number) => x * 2
      );

      const result = pipeline(5);

      expect(result).toBe(12);
      expect(log).toEqual([6]);
    });
  });
});
