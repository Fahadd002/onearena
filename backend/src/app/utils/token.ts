import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import config from "../../config/index";
import { Response } from "express";
import { cookieUtils } from "./cookie";

const getCookieSecurity = (res: Response) => {
    const req = (res as any).req;
    const isSecure = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || req?.headers?.['x-forwarded-ssl'] === 'on';
    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? ("none" as const) : ("lax" as const),
        path: "/",
    };
};

const getAccessToken = (payload: JwtPayload) => {
    const accessToken = jwtUtils.createToken(payload, config.accessTokenSecret as string, { expiresIn: config.accessTokenExpiresIn } as SignOptions);
    return accessToken;
}

const getRefreshToken = (payload: JwtPayload) => {
    const refreshToken = jwtUtils.createToken(payload, config.refreshTokenSecret as string, { expiresIn: config.refreshTokenExpiresIn } as SignOptions);
    return refreshToken;
}

const setAccessTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, 'accessToken', token, {
        ...getCookieSecurity(res),
        maxAge: 60 * 60 * 24 * 1000,
    });
}

const setRefreshTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, 'refreshToken', token, {
        ...getCookieSecurity(res),
        maxAge: 60 * 60 * 24 * 7 * 1000,
    });
}

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, 'better-auth.session_token', token, {
        ...getCookieSecurity(res),
        maxAge: 60 * 60 * 24 * 1000,
    });
}

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    setBetterAuthSessionCookie
}
