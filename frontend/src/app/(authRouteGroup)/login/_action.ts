/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getDefaultDashboardRoute, isValidRedirectForRole, UserRole } from "@/lib/authUtils";
import { httpClient } from "@/lib/axios/httpClient";
import { setTokenInCookies } from "@/lib/token.ulits";
import { ApiErrorResponse } from "@/types/api.type";
import { ILoginResponse } from "@/types/auth.type";
import { ILoginPayload, loginZodSchema } from "@/zod/auth.validation";

export const loginAction = async (
    payload : ILoginPayload & { rememberMe?: boolean },
    redirectPath ?: string
) : Promise<(ILoginResponse & { redirectPath: string }) | ApiErrorResponse> => {
    const { rememberMe = true, ...credentials } = payload;
    const parsedPayload = loginZodSchema.safeParse(credentials);

    if (!parsedPayload.success) {
        const firstError = parsedPayload.error.issues[0].message || "Invalid input";
        return {
            success: false,
            message: firstError,
        };
    }

    try {
        const response = await httpClient.post<ILoginResponse>("/auth/login", parsedPayload.data);

        const { accessToken, refreshToken, token, user } = response.data;
        const { role, emailVerified, needPasswordChange, email } = user;

        await setTokenInCookies("accessToken", accessToken, undefined, rememberMe);
        await setTokenInCookies("refreshToken", refreshToken, undefined, rememberMe);
        await setTokenInCookies("better-auth.session_token", token, rememberMe ? 24 * 60 * 60 : undefined, rememberMe);

        const targetPath = !emailVerified
            ? `/verify-email?email=${email}`
            : needPasswordChange
                ? `/reset-password?email=${email}`
                : redirectPath && isValidRedirectForRole(redirectPath, role as UserRole)
                    ? redirectPath
                    : getDefaultDashboardRoute(role as UserRole);

        return {
            ...response.data,
            redirectPath: targetPath,
        };
    } catch (error: any) {
        const message =
            error?.response?.data?.message ||
            error?.message ||
            "Unknown error";

        return {
            success: false,
            message: `Login failed: ${message}`,
        };
    }
};