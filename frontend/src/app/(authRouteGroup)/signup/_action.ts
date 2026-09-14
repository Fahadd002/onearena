/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { IRegisterResponse } from "@/types/auth.type";
import { IRegisterPayload, registerZodSchema } from "@/zod/auth.validation";

export const registerAction = async (payload : IRegisterPayload) : Promise<ApiResponse<IRegisterResponse> | ApiErrorResponse> =>{
    const parsedPayload = registerZodSchema.safeParse(payload);

    if(!parsedPayload.success){
        const firstError = parsedPayload.error.issues[0].message || "Invalid input";
        return {
            success: false,
            message: firstError,
        }
    }

    try {
        const response = await httpClient.post<IRegisterResponse>("/auth/register", parsedPayload.data);
        // Return the full ApiResponse so the client receives `{ success, message, data }`.
        return response;
    } catch (error : any) {
        // Do not treat Next.js internal redirect errors as generic failures here.
        if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }

        return {
            success: false,
            message: error?.response?.data?.message || "Registration failed",
        }
    }
}