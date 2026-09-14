/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { IVerifyEmailResponse } from "@/types/auth.type";
import { IVerifyEmailPayload, verifyEmailZodSchema } from "@/zod/auth.validation";

export const verifyEmailAction = async (payload: IVerifyEmailPayload): Promise<ApiResponse<IVerifyEmailResponse> | ApiErrorResponse> => {
    const parsedPayload = verifyEmailZodSchema.safeParse(payload);

    if (!parsedPayload.success) {
        const firstError = parsedPayload.error.issues[0].message || "Invalid input";
        return {
            success: false,
            message: firstError,
        };
    }

    try {
        const response = await httpClient.post<IVerifyEmailResponse>("/auth/verify-email", parsedPayload.data);
        // Return the full ApiResponse so client sees { success, message, data }
        return response;
    } catch (error: any) {
        if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }

        return {
            success: false,
            message: error?.response?.data?.message || "Verification failed",
        };
    }
};