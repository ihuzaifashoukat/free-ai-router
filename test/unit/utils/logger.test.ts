import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '../../../src/utils/logger';

describe('Logger', () => {
    it('does not log info if debug is false', () => {
        const customLogger = vi.fn();
        const logger = createLogger(false, customLogger);

        logger.log('test log');
        expect(customLogger).not.toHaveBeenCalled();

        logger.warn('test warn');
        expect(customLogger).toHaveBeenCalledWith('[free-ai-router] WARN: test warn', undefined);

        logger.error('test error', { meta: 1 });
        expect(customLogger).toHaveBeenCalledWith('[free-ai-router] ERROR: test error', { meta: 1 });
    });

    it('logs info if debug is true', () => {
        const customLogger = vi.fn();
        const logger = createLogger(true, customLogger);

        logger.log('test log', { foo: 'bar' });
        expect(customLogger).toHaveBeenCalledWith('[free-ai-router] test log', { foo: 'bar' });
    });

    it('falls back to console if no custom logger', () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

        const logger = createLogger(true);
        logger.log('hello');
        expect(consoleLog).toHaveBeenCalledWith('[free-ai-router] hello');

        logger.warn('warning', { x: 1 });
        expect(consoleWarn).toHaveBeenCalledWith('[free-ai-router] WARN: warning', { x: 1 });

        logger.error('bad');
        expect(consoleError).toHaveBeenCalledWith('[free-ai-router] ERROR: bad');

        consoleLog.mockRestore();
        consoleWarn.mockRestore();
        consoleError.mockRestore();
    });
});
