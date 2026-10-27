"use server";

import { getDefaultDashboardRoute, isValidRedirectForRole, UserRole } from "@/lib/authUtils";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { setTokenInCookies } from "@/lib/token.ulits";
import { ApiErrorResponse } from "@/types/api.type";
import { IEmailSetupRequiredResponse, ILoginResponse } from "@/types/auth.type";
import { ILoginPayload, loginZodSchema } from "@/zod/auth.validation";

export const loginAction = async (
    payload : ILoginPayload & { rememberMe?: boolean; recaptchaToken: string },
    redirectPath ?: string
) : Promise<((ILoginResponse | IEmailSetupRequiredResponse) & { redirectPath: string }) | ApiErrorResponse> => {
    const { rememberMe = true, recaptchaToken, ...credentials } = payload;
    const parsedPayload = loginZodSchema.safeParse(credentials);

    if (!parsedPayload.success) {
        const firstError = parsedPayload.error.issues[0].message || "Invalid input";
        return {
            success: false,
            message: firstError,
        };
    }

    try {
        const response = await httpClient.post<ILoginResponse | IEmailSetupRequiredResponse>(
            API_ENDPOINTS.auth.login,
            { ...parsedPayload.data, recaptchaToken },
        );

        if ("needsEmailSetup" in response.data) {
            return {
                ...response.data,
                redirectPath: `/email-setup?phone=${encodeURIComponent(response.data.phone)}`,
            };
        }

        const { accessToken, refreshToken, token, user } = response.data;
        const { role, emailVerified, needPasswordChange, email } = user;

        await setTokenInCookies("accessToken", accessToken, undefined, rememberMe);
        await setTokenInCookies("refreshToken", refreshToken, undefined, rememberMe);
        await setTokenInCookies("better-auth.session_token", token, rememberMe ? 24 * 60 * 60 : undefined, rememberMe);

        const targetPath = !emailVerified
            ? `/verify-email?email=${encodeURIComponent(email)}`
            : needPasswordChange
                ? `/reset-password?email=${email}`
                : redirectPath && isValidRedirectForRole(redirectPath, role as UserRole)
                    ? redirectPath
                    : getDefaultDashboardRoute(role as UserRole);

        return {
            ...response.data,
            redirectPath: targetPath,
        };
    } catch (error: unknown) {
        const apiError = error as {
            response?: { data?: { message?: string } };
            message?: string;
        };
        const message =
            apiError.response?.data?.message ||
            apiError.message ||
            "Unknown error";

        return {
            success: false,
            message: `Login failed: ${message}`,
        };
    }
};
