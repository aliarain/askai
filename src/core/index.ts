// Types
export type {
  AiService,
  ServiceDefinition,
  ServiceTier,
  KnownServiceId,
  CustomServiceInput,
  ServiceConfig,
  CreatePromptOptions,
  PromptResult,
  PromptContent,
} from './types';

// The registry: the single source of truth for every destination.
export {
  SERVICE_DEFINITIONS,
  VERIFIED_SERVICE_IDS,
  DEFAULT_SERVICE_IDS,
  DEFAULT_MAX_ENCODED,
} from './registry';

// Registry access
export {
  createRegistry,
  getService,
  getServices,
  getServiceIds,
  hasService,
  addService,
  removeService,
  resetServices,
  DEFAULT_SERVICES,
  type Registry,
} from './services';

// Prompt and URL building
export {
  buildPrompt,
  createAiPrompt,
  createAiPrompts,
  validateUrl,
  openAiPrompt,
  looksLikeCode,
} from './builder';
