import { PublicKey } from "@solana/web3.js";
import { Environment, MarginfiConfig } from "./types";
import { array, assert, enums, Infer, object, string } from "superstruct";
import configs from "./configs.json";

const MarginfiConfigRaw = object({
  label: enums(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"]),
  cluster: string(),
  program: string(),
  group: string(),
});
const ConfigRaw = array(MarginfiConfigRaw);

export type MarginfiConfigRaw = Infer<typeof MarginfiConfigRaw>;
export type ConfigRaw = Infer<typeof ConfigRaw>;

function parseConfig(configRaw: MarginfiConfigRaw): MarginfiConfig {
  return {
    environment: configRaw.label,
    cluster: configRaw.cluster,
    programId: new PublicKey(configRaw.program),
    groupPk: new PublicKey(configRaw.group),
  };
}

function parseConfigs(configRaw: ConfigRaw): {
  [label: string]: MarginfiConfig;
} {
  return configRaw.reduce(
    (config, current, _) => ({
      [current.label]: parseConfig(current),
      ...config,
    }),
    {} as {
      [label: string]: MarginfiConfig;
    }
  );
}

function loadDefaultConfig(): {
  [label: string]: MarginfiConfig;
} {
  assert(configs, ConfigRaw);
  return parseConfigs(configs);
}

/**
 * Define marginfi-specific config per profile
 *
 * @internal
 */
function getMarginfiConfig(
  environment: Environment,
  overrides?: Partial<Omit<MarginfiConfig, "environment">>
): MarginfiConfig {
  const defaultConfigs = loadDefaultConfig();

  switch (environment) {
    case "production":
    case "alpha":
    case "staging":
    case "dev":
    case "mainnet-test-1":
    case "dev.1":
      const defaultConfig = defaultConfigs[environment];
      return {
        environment,
        programId: overrides?.programId || defaultConfig.programId,
        groupPk: overrides?.groupPk || defaultConfig.groupPk,
        cluster: overrides?.cluster || defaultConfig.cluster,
      };
    default:
      throw Error(`Unknown environment ${environment}`);
  }
}

/**
 * Retrieve config per environment
 */
export function getConfig(
  environment: Environment = "production",
  overrides?: Partial<Omit<MarginfiConfig, "environment">>
): MarginfiConfig {
  return {
    ...getMarginfiConfig(environment, overrides),
  };
}
