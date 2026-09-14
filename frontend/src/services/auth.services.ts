/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { ApiResponse, ApiErrorResponse } from "@/types/api.type";
import { setTokenInCookies } from "@/lib/token.ulits";
import { deleteCookie } from "@/lib/cookie.utils";
import { cookies } from "next/headers";
import { IAuthUser, ILoginResponse, IRefreshTokenResponse, IRegisterResponse, IVerifyEmailResponse } from "@/types/auth.type";
import { ILoginPayload, IRegisterPayload } from "@/zod/auth.validation";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";

// Login
export async function login(payload: ILoginPayload): Promise<ApiResponse<ILoginResponse> | ApiErrorResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Login failed",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Login failed",
        };
    }
}

// Register
export async function register(payload: IRegisterPayload): Promise<ApiResponse<IRegisterResponse> | ApiErrorResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.register}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Registration failed",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Registration failed",
        };
    }
}

// Get current user info
export async function getUserInfo(): Promise<IAuthUser | null> {
    try {
        const cookieStore = await cookies();
        const authCookieHeader = cookieStore
            .getAll()
            .filter((cookie) =>
                cookie.name === "accessToken" ||
                cookie.name === "refreshToken" ||
                cookie.name === "better-auth.session_token"
            )
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ");

        if (!authCookieHeader) {
            return null;
        }

        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.me}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookieHeader,
            }
        });

        if (!res.ok) {
            console.error("Failed to fetch user info:", res.status, res.statusText);
            return null;
        }

        const { data } = await res.json();

        return data;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
}

// Refresh token
export async function refreshTokens(refreshToken: string): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const betterAuthSessionToken = cookieStore.get("better-auth.session_token")?.value

        if (!betterAuthSessionToken) {
            return false;
        }

        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.refreshToken}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: `refreshToken=${refreshToken}; better-auth.session_token=${betterAuthSessionToken}`
            }
        });

        if (!res.ok) {
            return false;
        }

        const { data }: ApiResponse<IRefreshTokenResponse> = await res.json();

        const { accessToken, refreshToken: newRefreshToken, sessionToken } = data;

        if (accessToken) {
            await setTokenInCookies("accessToken", accessToken);
        }

        if (newRefreshToken) {
            await setTokenInCookies("refreshToken", newRefreshToken);
        }

        if (sessionToken) {
            await setTokenInCookies("better-auth.session_token", sessionToken, 24 * 60 * 60);
        }

        return true;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return false;
    }
}

// Change password
export async function changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<ILoginResponse> | ApiErrorResponse> {
    try {
        const cookieStore = await cookies();
        const authCookieHeader = cookieStore
            .getAll()
            .filter((cookie) =>
                cookie.name === "accessToken" ||
                cookie.name === "refreshToken" ||
                cookie.name === "better-auth.session_token"
            )
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ");

        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.changePassword}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookieHeader,
            },
            body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
        });

        const data = await res.json();

        if (!res.ok) {
            return {
                success: false,
                message: data.message || "Password change failed",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Password change failed",
        };
    }
}

// Logout
export async function logout(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const authCookieHeader = cookieStore
            .getAll()
            .filter((cookie) =>
                cookie.name === "accessToken" ||
                cookie.name === "refreshToken" ||
                cookie.name === "better-auth.session_token"
            )
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ");

        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookieHeader,
            },
        });

        if (res.ok) {
            // Clear server-side cookies
            await deleteCookie("accessToken");
            await deleteCookie("refreshToken");
            await deleteCookie("better-auth.session_token");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error logging out:", error);
        return false;
    }
}

// Verify email
export async function verifyEmail(email: string, otp: string): Promise<ApiResponse<IVerifyEmailResponse> | ApiErrorResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.verifyEmail}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Email verification failed",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Email verification failed",
        };
    }
}

// Forgot password
export async function forgotPassword(email: string): Promise<ApiResponse<null> | ApiErrorResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.forgotPassword}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to send reset OTP",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to send reset OTP",
        };
    }
}

// Reset password
export async function resetPassword(email: string, otp: string, newPassword: string): Promise<ApiResponse<null> | ApiErrorResponse> {
    try {
        const cookieStore = await cookies();
        const authCookieHeader = cookieStore
            .getAll()
            .filter((cookie) =>
                cookie.name === "accessToken" ||
                cookie.name === "refreshToken" ||
                cookie.name === "better-auth.session_token"
            )
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ");

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.resetPassword}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Cookie: authCookieHeader,
            },
            body: JSON.stringify({ email, otp, newPassword }),
        });

        const data = await response.json();

        // Clear cookies after successful reset
        if (response.ok) {
            await deleteCookie("accessToken");
            await deleteCookie("refreshToken");
            await deleteCookie("better-auth.session_token");
        }

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Password reset failed",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Password reset failed",
        };
    }
}

// Resend verification OTP
export async function resendVerificationOtp(email: string): Promise<ApiResponse<null> | ApiErrorResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.resendVerificationOtp}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || "Failed to resend OTP",
            };
        }

        return data;
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Failed to resend OTP",
        };
    }
}

// Keep backward compatibility
export async function getNewTokensWithRefreshToken(refreshToken: string): Promise<boolean> {
    return refreshTokens(refreshToken);
}
