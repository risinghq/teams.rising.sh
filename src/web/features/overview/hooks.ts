import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/lib/query-keys";

export const useOverview = () =>
  useQuery({ queryKey: queryKeys.overview, queryFn: api.overview });
