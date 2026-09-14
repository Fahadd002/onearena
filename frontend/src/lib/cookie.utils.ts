"use server";
import { cookies } from "next/headers";

export const setCookie = async  (name: string, value: string, maxAgeInSeconds?: number) => {
    const cookieStrore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    cookieStrore.set(name, value, {
        httpOnly: true,
        secure: isProd,
        ...(maxAgeInSeconds === undefined ? {} : { maxAge: maxAgeInSeconds }),
        path: "/",
        sameSite: isProd ? "strict" : "lax",
    });
};

export const getCookie = async (name: string) => {
    const cookieStrore = await cookies();
    return cookieStrore.get(name)?.value;
}

export const deleteCookie = async (name: string) => {
    const cookieStrore = await cookies();
    cookieStrore.delete(name);
}