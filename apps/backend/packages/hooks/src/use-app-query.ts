import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions
} from "@tanstack/react-query";

export function useAppQuery<TData>(
  options: UseQueryOptions<TData, Error, TData, string[]>
) {
  return useQuery(options);
}

export function useAppMutation<TData, TVariables>(
  options: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation(options);
}
