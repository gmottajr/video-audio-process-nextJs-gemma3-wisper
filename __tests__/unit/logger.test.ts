/**
 * Unit tests for lib/logger.ts dev-gating behaviour.
 *
 * Key invariants:
 *  - info/debug: silent (no console, no fetch) in production.
 *  - warn/error: always reach the console, even in production.
 *  - fetch to /api/log is dev-only for every level.
 *
 * process.env.NODE_ENV is set per test; createLogger evaluates it inline
 * so we don't need module resets.
 */

import createLogger from '@/lib/logger';

describe('logger dev-gating', () => {
  let consoleLogs: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;
  let consoleError: jest.SpyInstance;
  let originalNodeEnv: string | undefined;
  let originalWindow: unknown;

  // Stub fetch because it is not globally available in jest's node environment.
  const fetchStub = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    // Expose window and fetch so the logger's browser-path is exercised.
    originalWindow = (global as any).window;
    (global as any).window = {};
    (global as any).fetch = fetchStub;
    fetchStub.mockClear();

    consoleLogs  = jest.spyOn(console, 'log').mockImplementation();
    consoleWarn  = jest.spyOn(console, 'warn').mockImplementation();
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    (global as any).window = originalWindow;
    delete (global as any).fetch;
    consoleLogs.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  describe('in production', () => {
    beforeEach(() => { process.env.NODE_ENV = 'production'; });

    test('info does not reach console', () => {
      const log = createLogger('Test');
      log.info('hello');
      expect(consoleLogs).not.toHaveBeenCalled();
    });

    test('debug does not reach console', () => {
      const log = createLogger('Test');
      log.debug('dbg');
      expect(consoleLogs).not.toHaveBeenCalled();
    });

    test('info does not call /api/log', () => {
      const log = createLogger('Test');
      log.info('hello');
      expect(fetchStub).not.toHaveBeenCalled();
    });

    test('debug does not call /api/log', () => {
      const log = createLogger('Test');
      log.debug('dbg');
      expect(fetchStub).not.toHaveBeenCalled();
    });

    test('error still reaches console.error in production', () => {
      const log = createLogger('Test');
      log.error('boom');
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('boom'), '');
    });

    test('warn still reaches console.warn in production', () => {
      const log = createLogger('Test');
      log.warn('watch out');
      expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('watch out'), '');
    });

    test('error does not call /api/log in production', () => {
      const log = createLogger('Test');
      log.error('boom');
      expect(fetchStub).not.toHaveBeenCalled();
    });
  });

  describe('in development', () => {
    beforeEach(() => { process.env.NODE_ENV = 'development'; });

    test('info reaches console.log', () => {
      const log = createLogger('Test');
      log.info('hello');
      expect(consoleLogs).toHaveBeenCalledWith(expect.stringContaining('hello'), '');
    });

    test('debug reaches console.log', () => {
      const log = createLogger('Test');
      log.debug('dbg');
      expect(consoleLogs).toHaveBeenCalledWith(expect.stringContaining('dbg'), '');
    });

    test('info calls /api/log when window is defined', () => {
      const log = createLogger('Test');
      log.info('hello');
      expect(fetchStub).toHaveBeenCalledWith(
        '/api/log',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    test('error reaches console.error in development', () => {
      const log = createLogger('Test');
      log.error('boom');
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('boom'), '');
    });
  });
});
