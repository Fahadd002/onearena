/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiResponse } from '@/types/api.type';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';

const isBrowser = typeof window !== "undefined";

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    
    isRefreshing = false;
    failedQueue = [];
};

async function refreshTokenViaApi(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.refreshToken}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return false;
        }

        return true;
    } catch (error: any) {
        console.error("Error refreshing token via API:", error);
        return false;
    }
}

async function getServerCookieHeader(): Promise<string> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
}

const createAxiosInstance = async (): Promise<AxiosInstance> => {
    if (isBrowser) {
        const instance = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
            withCredentials: true,
        });

        // Add response interceptor to handle token refresh on client side
        instance.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                if (error.response?.status === 401 && !originalRequest._retry) {

                    if (isRefreshing) {
                        return new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        }).then(() => {
                            return instance(originalRequest);
                        });
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const success = await refreshTokenViaApi();
                        if (success) {
                            processQueue(null);
                            return instance(originalRequest);
                        } else {
                            processQueue(new Error("Token refresh failed"), null);
                            // Redirect to login
                            window.location.href = '/login';
                            return Promise.reject(error);
                        }
                    } catch (err) {
                        processQueue(err, null);
                        window.location.href = '/login';
                        return Promise.reject(error);
                    }
                }

                return Promise.reject(error);
            }
        );

        return instance;
    }

    // Server: explicitly forward cookies to API
    const cookieHeader = await getServerCookieHeader();

    const instance = axios.create({
        baseURL : API_BASE_URL,
        timeout : 30000,
        headers:{
            'Cookie' : cookieHeader
        }
    })

    return instance;
}

export interface ApiRequestOptions {
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
}

const isFormDataPayload = (data: unknown): data is FormData => {
    return typeof FormData !== "undefined" && data instanceof FormData;
};

const resolveRequestHeaders = (data: unknown, headers?: Record<string, string>) => {
    const resolvedHeaders = { ...(headers ?? {}) };

    // Let axios/browser set multipart boundaries automatically for FormData.
    if (isFormDataPayload(data)) {
        delete resolvedHeaders["Content-Type"];
    }

    return resolvedHeaders;
};

const httpGet = async <TData> (endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
    try {        
        const instance = await createAxiosInstance();
        const response = await instance.get<ApiResponse<TData>>(endpoint, {
            params: options?.params,
            headers: options?.headers,
        });
        return response.data;
    } catch (error) {       
        console.error(`GET request to ${endpoint} failed:`, error);
        throw error;
    }
}

const httpPost = async <TData> (endpoint: string, data: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
    try {
        const instance = await createAxiosInstance();
        const response = await instance.post<ApiResponse<TData>>(endpoint, data, {
            params: options?.params,
            headers: resolveRequestHeaders(data, options?.headers),
        });
        return response.data;
    } catch (error) {
        console.error(`POST request to ${endpoint} failed:`, error);
        throw error;
    }
}

const httpPut = async <TData> (endpoint: string, data: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
    try {
        const instance = await createAxiosInstance();
        const response = await instance.put<ApiResponse<TData>>(endpoint, data, {
            params: options?.params,
            headers: resolveRequestHeaders(data, options?.headers),
        });
        return response.data;
    } catch (error) {
        console.error(`PUT request to ${endpoint} failed:`, error);
        throw error;
    }
}

const httpPatch = async <TData> (endpoint: string, data: unknown, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
    try {
        const instance = await createAxiosInstance();
        const response = await instance.patch<ApiResponse<TData>>(endpoint, data, {
            params: options?.params,
            headers: resolveRequestHeaders(data, options?.headers),
        });
        return response.data;
    }
    catch (error) {
        console.error(`PATCH request to ${endpoint} failed:`, error);
        throw error;
    }
}

const httpDelete = async <TData> (endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> => {
    try {
        const instance = await createAxiosInstance();
        const response = await instance.delete<ApiResponse<TData>>(endpoint, {
            params: options?.params,
            headers: options?.headers,
        });
        return response.data;
    } catch (error) {
        console.error(`DELETE request to ${endpoint} failed:`, error);
        throw error;
    }
}

export const httpClient = {
    get: httpGet,
    post: httpPost,
    put: httpPut,
    patch: httpPatch,
    delete: httpDelete,
}
