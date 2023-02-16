import { PublicKey } from "@solana/web3.js";
import { LipConfig } from "./types";
import { array, assert, enums, Infer, object, string } from "superstruct";
import configs from "./configs.json";
import { Environment } from "@mrgnlabs/marginfi-client-v2";

const LipConfigRaw = object({
  label: enums(["production", "alpha", "staging", "dev"]),
  cluster: string(),
  program: string(),
});
const ConfigRaw = array(LipConfigRaw);

export type LipConfigRaw = Infer<typeof LipConfigRaw>;
export type ConfigRaw = Infer<typeof ConfigRaw>;

function parseConfig(configRaw: LipConfigRaw): LipConfig {
  return {
    environment: configRaw.label,
    cluster: configRaw.cluster,
    programId: new PublicKey(configRaw.program),
  };
}

/**
 * Parse Configs
 */
function parseConfigs(configRaw: ConfigRaw): {
  [label: string]: LipConfig;
} {
  return configRaw.reduce(
    (config, current, _) => ({
      [current.label]: parseConfig(current),
      ...config,
    }),
    {} as {
      [label: string]: LipConfig;
    }
  );
}

function loadDefaultConfig(): {
  [label: string]: LipConfig;
} {
  assert(configs, ConfigRaw);
  return parseConfigs(configs);
}

/**
 * Define lip-specific config per profile
 *
 * @internal
 */
function getLipConfig(environment: Environment, overrides?: Partial<Omit<LipConfig, "environment">>): LipConfig {
  const defaultConfigs = loadDefaultConfig();

  switch (environment) {
    case "production":
    case "alpha":
    case "staging":
    case "dev":
      const defaultConfig = defaultConfigs[environment];
      return {
        environment,
        programId: overrides?.programId || defaultConfig.programId,
        cluster: overrides?.cluster || defaultConfig.cluster,
      };
    default:
      throw Error(`Unknown environment ${environment}`);
  }
}

/**
 * Retrieve config per environment
 */
export function getConfig(environment: Environment, overrides?: Partial<Omit<LipConfig, "environment">>): LipConfig {
  return {
    ...getLipConfig(environment, overrides),
  };
}
