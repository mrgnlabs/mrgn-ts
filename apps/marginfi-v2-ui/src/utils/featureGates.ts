import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

enum Features {
  STAKE = "stake",
}

function isActive(feature: Features) {
  const featureGatesRaw = process.env.NEXT_PUBLIC_FEATURE_GATES as string | undefined;
  if (!featureGatesRaw) return true;

  const featureGates = JSON.parse(featureGatesRaw) as Record<string, boolean>;

  return !!featureGates[feature];
}

function getBlockedActions(): ActionType[] | undefined {
  const actionGate =
    process.env.NEXT_PUBLIC_ACTION_GATE && Object.values(JSON.parse(process.env.NEXT_PUBLIC_ACTION_GATE)) as string[];

  if (!actionGate) return undefined;

  return (
    actionGate &&
    actionGate
      .map((action) => {
        if (action in ActionType) {
          return ActionType[action as keyof typeof ActionType];
        }
        console.warn(`"${action}" is not a valid ActionType key.`);
        return undefined;
      })
      .filter((type): type is ActionType => type !== undefined)
  );
}

export { Features, isActive, getBlockedActions };
