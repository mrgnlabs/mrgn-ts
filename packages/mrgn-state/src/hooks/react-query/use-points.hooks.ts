import { useQuery } from "@tanstack/react-query";
import { getPointsSummary } from "../../lib";
import { DocumentData } from "firebase/firestore";

export function usePoints() {
  return useQuery<DocumentData, Error>({
    queryKey: ["pointsData"],
    queryFn: () => getPointsSummary(),
    staleTime: Infinity,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
