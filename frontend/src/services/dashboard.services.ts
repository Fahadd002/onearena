import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

export type DashboardResponse = Record<string, unknown>;

export const getDashboard = (endpoint: string) => httpClient.get<DashboardResponse>(endpoint);

export const dashboardEndpoints = API_ENDPOINTS.marketplace;