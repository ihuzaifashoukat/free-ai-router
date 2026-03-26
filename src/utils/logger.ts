// src/utils/logger.ts — Lightweight conditional debug logger
const PREFIX = '[free-ai-router]';

/** Check if debug mode is enabled via env or config */
function isDebugEnv(): boolean {
    try {
        const dbg = globalThis.process?.env?.['DEBUG'];
        return dbg === 'free-ai-router' || dbg === '*' || dbg === 'true';
    } catch {
        return false;
    }
}

/**
 * Create a scoped logger that only outputs when debug is enabled.
 * @param debug - Whether debug mode is explicitly enabled via config
 * @param customLogger - Optional custom logger function
 * @returns Logger object with log, warn, error methods
 */
export function createLogger(
    debug?: boolean,
    customLogger?: (msg: string, meta?: unknown) => void,
) {
    const enabled = debug === true || isDebugEnv();

    const log = (msg: string, meta?: unknown): void => {
        if (!enabled) return;
        if (customLogger) {
            customLogger(`${PREFIX} ${msg}`, meta);
            return;
        }
        if (meta !== undefined) {
            console.log(`${PREFIX} ${msg}`, meta);
        } else {
            console.log(`${PREFIX} ${msg}`);
        }
    };

    const warn = (msg: string, meta?: unknown): void => {
        if (customLogger) {
            customLogger(`${PREFIX} WARN: ${msg}`, meta);
            return;
        }
        if (meta !== undefined) {
            console.warn(`${PREFIX} WARN: ${msg}`, meta);
        } else {
            console.warn(`${PREFIX} WARN: ${msg}`);
        }
    };

    const error = (msg: string, meta?: unknown): void => {
        if (customLogger) {
            customLogger(`${PREFIX} ERROR: ${msg}`, meta);
            return;
        }
        if (meta !== undefined) {
            console.error(`${PREFIX} ERROR: ${msg}`, meta);
        } else {
            console.error(`${PREFIX} ERROR: ${msg}`);
        }
    };

    return { log, warn, error, enabled } as const;
}

/** Logger instance type */
export type Logger = ReturnType<typeof createLogger>;
