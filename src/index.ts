// src/index.ts
import { FreeAIRouterOpenAI } from './compat/openai-interface.js'
export { FreeAIRouterOpenAI as default, FreeAIRouterOpenAI as FreeAIRouter }

// Export config schema and types
export { type RouterConfig, type RouterConfigInput } from './config/schema.js'
export * from './providers/types.js'

// Export Error classes for consumer usage
export {
    FreeRouterError,
    NoAvailableModelError,
    AllKeysExhaustedError,
    RateLimitError,
    ProviderError
} from './compat/error-mapper.js'
