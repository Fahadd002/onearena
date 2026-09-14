import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/axios/httpClient";

export function useGet<TData>(endpoint: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await httpClient.get<TData>(endpoint);
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePost<TData, TVariables = unknown>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: TVariables }) => {
      const response = await httpClient.post<TData>(endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function usePatch<TData, TVariables = unknown>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: TVariables }) => {
      const response = await httpClient.patch<TData>(endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (endpoint: string) => {
      const response = await httpClient.delete(endpoint);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
