/**
 * Unit tests for PendingRequestRegistry.
 *
 * Pure logic — no DOM, no Worker, no mocks beyond the request shape.
 */

import { PendingRequestRegistry } from '@/lib/PendingRequestRegistry';
import type { WorkerRequest } from '@/lib/WorkerManager';

// Suppress logger warn/error output during tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'log').mockImplementation();
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
});
afterAll(() => jest.restoreAllMocks());

function makeRequest(overrides: Partial<WorkerRequest> = {}): WorkerRequest {
  return {
    id: 'req_test',
    type: 'load',
    data: {},
    resolve: jest.fn(),
    reject: jest.fn(),
    timeout: setTimeout(() => {}, 9999) as any,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('PendingRequestRegistry', () => {
  let reg: PendingRequestRegistry;

  beforeEach(() => {
    reg = new PendingRequestRegistry();
  });

  afterEach(() => {
    // Clean up any lingering timeouts from makeRequest
    reg.forEach((req) => clearTimeout(req.timeout));
  });

  // -------------------------------------------------------------------------
  describe('nextId()', () => {
    it('generates unique IDs on successive calls', () => {
      const id1 = reg.nextId();
      const id2 = reg.nextId();
      const id3 = reg.nextId();
      expect(new Set([id1, id2, id3]).size).toBe(3);
    });

    it('IDs start with "req_"', () => {
      expect(reg.nextId()).toMatch(/^req_/);
    });
  });

  // -------------------------------------------------------------------------
  describe('add / get / delete / size', () => {
    it('stores and retrieves a request by ID', () => {
      const id = reg.nextId();
      const req = makeRequest({ id });
      reg.add(id, req);
      expect(reg.get(id)).toBe(req);
    });

    it('size reflects the number of stored requests', () => {
      expect(reg.size).toBe(0);
      const id = reg.nextId();
      reg.add(id, makeRequest({ id }));
      expect(reg.size).toBe(1);
    });

    it('delete removes the request', () => {
      const id = reg.nextId();
      reg.add(id, makeRequest({ id }));
      reg.delete(id);
      expect(reg.get(id)).toBeUndefined();
      expect(reg.size).toBe(0);
    });

    it('get returns undefined for an unknown ID', () => {
      expect(reg.get('no-such-id')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('keys() / values() / forEach()', () => {
    it('keys() yields every stored ID', () => {
      const id1 = reg.nextId();
      const id2 = reg.nextId();
      reg.add(id1, makeRequest({ id: id1 }));
      reg.add(id2, makeRequest({ id: id2 }));
      expect(Array.from(reg.keys())).toEqual(expect.arrayContaining([id1, id2]));
    });

    it('values() yields every stored request', () => {
      const id = reg.nextId();
      const req = makeRequest({ id });
      reg.add(id, req);
      const vals = Array.from(reg.values());
      expect(vals).toHaveLength(1);
      expect(vals[0]).toBe(req);
    });

    it('forEach() iterates every request', () => {
      const id1 = reg.nextId();
      const id2 = reg.nextId();
      reg.add(id1, makeRequest({ id: id1 }));
      reg.add(id2, makeRequest({ id: id2 }));
      const seen: string[] = [];
      reg.forEach((req) => seen.push(req.id));
      expect(seen).toEqual(expect.arrayContaining([id1, id2]));
    });
  });

  // -------------------------------------------------------------------------
  describe('rejectAll()', () => {
    it('calls reject on every pending request', () => {
      const id1 = reg.nextId();
      const id2 = reg.nextId();
      const req1 = makeRequest({ id: id1 });
      const req2 = makeRequest({ id: id2 });
      reg.add(id1, req1);
      reg.add(id2, req2);

      const error = new Error('disposed');
      reg.rejectAll(error);

      expect(req1.reject).toHaveBeenCalledWith(error);
      expect(req2.reject).toHaveBeenCalledWith(error);
    });

    it('clears all requests after rejecting', () => {
      const id = reg.nextId();
      reg.add(id, makeRequest({ id }));
      reg.rejectAll(new Error('gone'));
      expect(reg.size).toBe(0);
    });

    it('is a no-op when the registry is empty', () => {
      expect(() => reg.rejectAll(new Error('nothing'))).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  describe('oldestAge()', () => {
    it('returns null when the registry is empty', () => {
      expect(reg.oldestAge()).toBeNull();
    });

    it('returns a non-negative number when there is at least one request', async () => {
      const id = reg.nextId();
      reg.add(id, makeRequest({ id, timestamp: Date.now() }));

      // Wait a tick so elapsed time > 0
      await new Promise(resolve => setTimeout(resolve, 5));

      const age = reg.oldestAge();
      expect(age).not.toBeNull();
      expect(age!).toBeGreaterThanOrEqual(0);
    });

    it('returns the age of the oldest request when there are multiple', async () => {
      const now = Date.now();
      const id1 = reg.nextId();
      const id2 = reg.nextId();
      // Make id1 appear older by backdating its timestamp
      reg.add(id1, makeRequest({ id: id1, timestamp: now - 500 }));
      reg.add(id2, makeRequest({ id: id2, timestamp: now - 100 }));

      const age = reg.oldestAge();
      expect(age!).toBeGreaterThanOrEqual(500);
    });
  });
});
