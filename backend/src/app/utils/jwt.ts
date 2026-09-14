/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const createToken = (payload: JwtPayload, secret: string, {expiresIn}:SignOptions) => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
}
//Here it can have two return type, JWTPayload or string, because if the token is valid it will return the decoded payload,
//but if it's invalid it will throw an error, so we need to catch that error and return it as well.
const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;   
    return {
        success: true,
        data: decoded,
    };
  } catch (error: any) {
    return {
        success: false,
        message: error.message,
        error
    };
  }
}

const decodeToken = (token: string) => {
  const decoded = jwt.decode(token) as JwtPayload;    
    return decoded;
}


export const jwtUtils = {
    createToken,
    verifyToken,
    decodeToken,
}