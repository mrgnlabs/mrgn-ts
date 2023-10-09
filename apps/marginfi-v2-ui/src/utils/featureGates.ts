enum Features {
  STAKE = "stake",
}

function isActive(feature: Features) {
  const featureGatesRaw = process.env.NEXT_PUBLIC_FEATURE_GATES as string | undefined;
  if (!featureGatesRaw) return false;

  const featureGates = JSON.parse(featureGatesRaw) as Record<string, boolean>;

  return !!featureGates[feature];
}

export { Features, isActive };
