import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppConfigProps, initializeConfig } from "./config";

const qc = new QueryClient();

export function StateProvider({ config, children }: { config: AppConfigProps; children: React.ReactNode }) {
  initializeConfig(config);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
