import { MarginfiGroupType } from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "../../config";
import { useQuery } from "@tanstack/react-query";
import { fetchMarginfiGroup } from "../../api";

export function useMarginfiGroup() {
  const groupAddress = getConfig().mrgnConfig.groupPk;
  const base58GroupAddress = groupAddress.toBase58();

  return useQuery<MarginfiGroupType, Error>({
    queryKey: ["marginfiGroup", base58GroupAddress],
    queryFn: () => fetchMarginfiGroup(groupAddress),
    staleTime: Infinity,
    retry: 2,
  });
}
