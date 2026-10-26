"use server";
import { cookies } from "next/headers";

export const setCookie = async  (name: string, value: string, maxAgeInSeconds?: number) => {
    const cookieStrore = await cookies();
    const secure = process.env.COOKIE_SECURE === "true";
    const sameSite = process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax";

    cookieStrore.set(name, value, {
        httpOnly: true,
        secure,
        ...(maxAgeInSeconds === undefined ? {} : { maxAge: maxAgeInSeconds }),
        path: "/",
        sameSite,
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