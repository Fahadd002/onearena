import { CookieOptions, Request, Response } from "express";

const setCookie = (res:Response, name: string, value: string, options: CookieOptions) => {   
    res.cookie(name, value, options);
};

const getCookie = (req: Request, key: string) => {
    return req.cookies[key];
}

const clearCookie = (res: Response, key: string, options?: CookieOptions) => {
    res.clearCookie(key, options);
}

export const cookieUtils = {
    setCookie,
    getCookie,
    clearCookie,
}