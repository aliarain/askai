import {
  SERVICE_DEFINITIONS,
  VERIFIED_SERVICE_IDS,
  DEFAULT_SERVICE_IDS,
  type ServiceDefinition,
} from './registry';
import type { AiService, CustomServiceInput, ServiceConfig } from './types';

const BUILT_INS: ReadonlyMap<string, ServiceDefinition> = new Map(
  SERVICE_DEFINITIONS.map((s) => [s.id, s as ServiceDefinition])
);

/**
 * A set of AI destinations.
 *
 * Prefer creating your own with {@link createRegistry} in anything that runs on
 * a server. The module-level default below is shared by every request in the
 * process, so registering a custom service on one request would leak into the
 * next.
 */
export interface Registry {
  get(id: AiService): ServiceDefinition | undefined;
  has(id: string): boolean;
  ids(): AiService[];
  all(): ServiceDefinition[];
  /** Ids safe to offer by default: verified tier only. */
  verifiedIds(): AiService[];
  add(id: string, config: CustomServiceInput): void;
  remove(id: string): boolean;
  reset(): void;
}

function normalize(id: string): string {
  return id.toLowerCase();
}

function fromCustomInput(id: string, config: CustomServiceInput): ServiceDefinition {
  return {
    id: normalize(id),
    name: config.name,
    vendor: config.vendor ?? config.name,
    url: config.url,
    param: config.param,
    extraParams: config.extraParams,
    maxLength: config.maxLength ?? 8000,
    autoSubmit: config.autoSubmit ?? false,
    color: config.color ?? '#666666',
    tier: 'verified',
    verifiedOn: 'custom',
    note: config.note,
  };
}

/**
 * Create an isolated registry seeded with the built-in services.
 *
 * Use this instead of the module-level helpers anywhere concurrent requests
 * share a process.
 */
export function createRegistry(): Registry {
  const custom = new Map<string, ServiceDefinition>();

  const lookup = (id: string) => custom.get(normalize(id)) ?? BUILT_INS.get(normalize(id));

  return {
    get: (id) => lookup(id),
    has: (id) => lookup(id) !== undefined,
    ids: () => [...BUILT_INS.keys(), ...custom.keys()],
    all: () => [...BUILT_INS.values(), ...custom.values()],
    verifiedIds: () => [
      ...VERIFIED_SERVICE_IDS,
      ...[...custom.values()].filter((s) => s.tier === 'verified').map((s) => s.id),
    ],
    add: (id, config) => {
      custom.set(normalize(id), fromCustomInput(id, config));
    },
    remove: (id) => custom.delete(normalize(id)),
    reset: () => custom.clear(),
  };
}

/** Process-wide registry backing the module-level helpers below. */
const defaultRegistry = createRegistry();

export function getService(service: AiService): ServiceDefinition | undefined {
  return defaultRegistry.get(service);
}

export function hasService(id: string): boolean {
  return defaultRegistry.has(id);
}

export function getServiceIds(): AiService[] {
  return defaultRegistry.ids();
}

export function getServices(): Record<string, ServiceDefinition> {
  return Object.fromEntries(defaultRegistry.all().map((s) => [s.id, s]));
}

/**
 * Register a custom destination on the process-wide registry.
 *
 * Safe in the browser. On a server prefer {@link createRegistry}, because this
 * mutates state shared across requests.
 */
export function addService(id: string, config: CustomServiceInput | ServiceConfig): void {
  defaultRegistry.add(id, isLegacyConfig(config) ? fromLegacy(config) : config);
}

export function removeService(id: string): boolean {
  return defaultRegistry.remove(id);
}

export function resetServices(): void {
  defaultRegistry.reset();
}

function isLegacyConfig(c: CustomServiceInput | ServiceConfig): c is ServiceConfig {
  return 'baseUrl' in c || 'promptParam' in c;
}

function fromLegacy(c: ServiceConfig): CustomServiceInput {
  return {
    name: c.name,
    url: c.baseUrl,
    param: c.promptParam,
    extraParams: c.params,
    maxLength: c.maxLength,
    color: c.color,
  };
}

export { VERIFIED_SERVICE_IDS, DEFAULT_SERVICE_IDS };

/**
 * @deprecated Renamed to {@link DEFAULT_SERVICE_IDS}.
 */
export const DEFAULT_SERVICES = DEFAULT_SERVICE_IDS;
