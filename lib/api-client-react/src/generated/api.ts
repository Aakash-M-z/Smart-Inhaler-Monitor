/**
 * React Query hooks for the Smart Inhaler Monitor API.
 *
 * Auto-generated pattern — extended with insights and updated chart/stats types.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

import { customFetch } from "../custom-fetch";
import type { ErrorType } from "../custom-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InhalationStrength = "Low" | "Medium" | "High";
export type AlertType = "high_usage" | "low_strength" | "rapid_usage" | "attack_risk";
export type Severity = "none" | "low" | "medium" | "high";
export type StatusLevel = "Safe" | "Moderate" | "High Risk";
export type TrendDirection = "increasing" | "decreasing" | "stable";
export type RiskLevel = "Low" | "Moderate" | "High";
export type AlertTrend = "improving" | "worsening" | "stable";

export interface HealthStatus {
  status: string;
}

export interface UsageRecord {
  id: number;
  time: string;
  timestamp: string;
  strength: InhalationStrength;
  alert: boolean;
  alertType: AlertType | null;
  riskScore?: number;
  severity?: Severity;
}

export interface UsageStats {
  totalToday: number;
  lastUsageTime: string | null;
  alertsTriggeredToday: number;
  /** Smart status: "Safe" | "Moderate" | "High Risk" */
  status: StatusLevel;
  /** Highest AI risk score recorded today (0–100) */
  maxRiskScore?: number;
}

export interface Alert {
  id: number;
  type: AlertType;
  message: string;
  timestamp: string;
  time: string;
  severity?: Omit<Severity, "none">;
  riskScore?: number;
}

export interface UnreadAlertCount {
  count: number;
}

export interface ChartDataPoint {
  hour: string;
  count: number;
}

export interface UsageChartResponse {
  data: ChartDataPoint[];
  trend: TrendDirection;
}

export interface InsightsResponse {
  todayCount: number;
  yesterdayCount: number;
  vsYesterdayPct: number | null;
  vsYesterdayLabel: string;
  avgDailyUsage: number;
  peakUsageTime: string | null;
  riskLevel: RiskLevel;
  alertTrend: AlertTrend;
  weekAlertCount: number;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

// ─── Health Check ─────────────────────────────────────────────────────────────

export const getHealthCheckUrl = () => `/api/healthz`;

export const healthCheck = async (options?: RequestInit): Promise<HealthStatus> =>
  customFetch<HealthStatus>(getHealthCheckUrl(), { ...options, method: "GET" });

export const getHealthCheckQueryKey = () => [`/api/healthz`] as const;

export const getHealthCheckQueryOptions = <
  TData = Awaited<ReturnType<typeof healthCheck>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getHealthCheckQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheck>>> = ({ signal }) =>
    healthCheck({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof healthCheck>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useHealthCheck<
  TData = Awaited<ReturnType<typeof healthCheck>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getHealthCheckQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Use Inhaler ──────────────────────────────────────────────────────────────

export const getUseInhalerUrl = () => `/api/use-inhaler`;

export const useInhaler = async (options?: RequestInit): Promise<UsageRecord> =>
  customFetch<UsageRecord>(getUseInhalerUrl(), { ...options, method: "POST" });

export const getUseInhalerMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof useInhaler>>, TError, void, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationOptions<Awaited<ReturnType<typeof useInhaler>>, TError, void, TContext> => {
  const mutationKey = ["useInhaler"];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && "mutationKey" in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof useInhaler>>, void> = () =>
    useInhaler(requestOptions);
  return { mutationFn, ...mutationOptions };
};

export type UseInhalerMutationResult = NonNullable<Awaited<ReturnType<typeof useInhaler>>>;
export type UseInhalerMutationError = ErrorType<unknown>;

export const useUseInhaler = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<Awaited<ReturnType<typeof useInhaler>>, TError, void, TContext>;
  request?: SecondParameter<typeof customFetch>;
}): UseMutationResult<Awaited<ReturnType<typeof useInhaler>>, TError, void, TContext> =>
  useMutation(getUseInhalerMutationOptions(options));

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getGetStatsUrl = () => `/api/stats`;

export const getStats = async (options?: RequestInit): Promise<UsageStats> =>
  customFetch<UsageStats>(getGetStatsUrl(), { ...options, method: "GET" });

export const getGetStatsQueryKey = () => [`/api/stats`] as const;

export const getGetStatsQueryOptions = <
  TData = Awaited<ReturnType<typeof getStats>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetStatsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getStats>>> = ({ signal }) =>
    getStats({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getStats>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetStats<
  TData = Awaited<ReturnType<typeof getStats>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetStatsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Usage Logs ───────────────────────────────────────────────────────────────

export const getGetUsageLogsUrl = () => `/api/usage-logs`;

export const getUsageLogs = async (options?: RequestInit): Promise<UsageRecord[]> =>
  customFetch<UsageRecord[]>(getGetUsageLogsUrl(), { ...options, method: "GET" });

export const getGetUsageLogsQueryKey = () => [`/api/usage-logs`] as const;

export const getGetUsageLogsQueryOptions = <
  TData = Awaited<ReturnType<typeof getUsageLogs>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageLogs>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetUsageLogsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getUsageLogs>>> = ({ signal }) =>
    getUsageLogs({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getUsageLogs>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetUsageLogs<
  TData = Awaited<ReturnType<typeof getUsageLogs>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageLogs>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetUsageLogsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getGetAlertsUrl = () => `/api/alerts`;

export const getAlerts = async (options?: RequestInit): Promise<Alert[]> =>
  customFetch<Alert[]>(getGetAlertsUrl(), { ...options, method: "GET" });

export const getGetAlertsQueryKey = () => [`/api/alerts`] as const;

export const getGetAlertsQueryOptions = <
  TData = Awaited<ReturnType<typeof getAlerts>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetAlertsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getAlerts>>> = ({ signal }) =>
    getAlerts({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getAlerts>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetAlerts<
  TData = Awaited<ReturnType<typeof getAlerts>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetAlertsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Unread Alert Count ───────────────────────────────────────────────────────

export const getGetUnreadAlertCountUrl = () => `/api/alerts/unread-count`;

export const getUnreadAlertCount = async (options?: RequestInit): Promise<UnreadAlertCount> =>
  customFetch<UnreadAlertCount>(getGetUnreadAlertCountUrl(), { ...options, method: "GET" });

export const getGetUnreadAlertCountQueryKey = () => [`/api/alerts/unread-count`] as const;

export const getGetUnreadAlertCountQueryOptions = <
  TData = Awaited<ReturnType<typeof getUnreadAlertCount>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUnreadAlertCount>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetUnreadAlertCountQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getUnreadAlertCount>>> = ({ signal }) =>
    getUnreadAlertCount({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getUnreadAlertCount>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetUnreadAlertCount<
  TData = Awaited<ReturnType<typeof getUnreadAlertCount>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUnreadAlertCount>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetUnreadAlertCountQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Usage Chart ──────────────────────────────────────────────────────────────

export const getGetUsageChartUrl = () => `/api/usage-chart`;

export const getUsageChart = async (options?: RequestInit): Promise<UsageChartResponse> =>
  customFetch<UsageChartResponse>(getGetUsageChartUrl(), { ...options, method: "GET" });

export const getGetUsageChartQueryKey = () => [`/api/usage-chart`] as const;

export const getGetUsageChartQueryOptions = <
  TData = Awaited<ReturnType<typeof getUsageChart>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageChart>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetUsageChartQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getUsageChart>>> = ({ signal }) =>
    getUsageChart({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getUsageChart>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetUsageChart<
  TData = Awaited<ReturnType<typeof getUsageChart>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getUsageChart>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetUsageChartQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export const getGetInsightsUrl = () => `/api/insights`;

export const getInsights = async (options?: RequestInit): Promise<InsightsResponse> =>
  customFetch<InsightsResponse>(getGetInsightsUrl(), { ...options, method: "GET" });

export const getGetInsightsQueryKey = () => [`/api/insights`] as const;

export const getGetInsightsQueryOptions = <
  TData = Awaited<ReturnType<typeof getInsights>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getInsights>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetInsightsQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getInsights>>> = ({ signal }) =>
    getInsights({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getInsights>>, TError, TData
  > & { queryKey: QueryKey };
};

export function useGetInsights<
  TData = Awaited<ReturnType<typeof getInsights>>,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<Awaited<ReturnType<typeof getInsights>>, TError, TData>;
  request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetInsightsQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}
