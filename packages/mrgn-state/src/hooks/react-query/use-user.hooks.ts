import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { fetchMarginfiAccount, fetchMarginfiAccountAddresses } from "../../api/user-api";
import { useSelectedAccountKey } from "../session-storage";

export function useMarginfiAccountAddresses(authority: PublicKey) {
  return useQuery<PublicKey[], Error>({
    queryKey: ["marginfiAccountAddresses", authority.toBase58()],
    queryFn: () => fetchMarginfiAccountAddresses(authority),
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useMarginfiAccount(authority: PublicKey) {
  const accountAddresses = useMarginfiAccountAddresses(authority);

  const { selectedKey: selectedAccountKey, setSelectedKey: setSelectedAccountKey } = useSelectedAccountKey(
    accountAddresses.data
  );

  // return useQuery<string | undefined, Error>({
  //   queryKey: ["marginfiAccount", selectedAccountKey],
  //   queryFn: () => fetchMarginfiAccount(authority),
  //   staleTime: 60_000, // 1 minute
  //   refetchInterval: 60_000,
  //   retry: 1,
  // });
}
