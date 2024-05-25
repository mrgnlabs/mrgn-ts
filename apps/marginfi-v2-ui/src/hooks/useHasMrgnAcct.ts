import { useState, useEffect } from "react";
import { useMrgnlendStore } from "~/store";

export const useHasMrgnAcct = (): boolean => {
  const [marginfiAccounts] = useMrgnlendStore((state) => [state.marginfiAccounts]);

  console.log({ marginfiAccounts });
  return false;
};
