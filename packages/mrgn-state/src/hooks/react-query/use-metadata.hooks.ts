import { useQuery } from "@tanstack/react-query";
import { fetchMetaData } from "../../api/metadata-api";

export type AppMetadata = Awaited<ReturnType<typeof fetchMetaData>>;

export function useMetadata() {
  console.log("post-transpile React-Query from:", require.resolve("@tanstack/react-query"));

  return useQuery<AppMetadata, Error>({
    queryKey: ["metadata"],
    queryFn: () => fetchMetaData(),
    staleTime: Infinity,
    refetchInterval: Infinity,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
