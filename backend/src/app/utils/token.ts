import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "./jwt";
import config from "../../config/index";
import { Response } from "express";
import { cookieUtils } from "./cookie";

const isProduction = process.env.NODE_ENV === "production";
const cookieSecurity = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" as const : "lax" as const,
    path: "/",
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
        ...cookieSecurity,
                //1 day
        maxAge: 60 * 60 * 24 * 1000,
    });
}

const setRefreshTokenCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, 'refreshToken', token, {
        ...cookieSecurity,
        //7d
        maxAge: 60 * 60 * 24 * 7 * 1000,
    });
}

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    cookieUtils.setCookie(res, 'better-auth.session_token', token, {
        ...cookieSecurity,
         //1 day
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