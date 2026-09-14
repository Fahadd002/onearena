export interface IAuthUser {
    id: string;
    name: string;
    email: string;
    role: "SUPER_ADMIN"|"ADMIN" | "MANAGER" | "USER";
    image?: string | null;
    profilePhoto?: string | null;
    isDeleted: boolean;
    emailVerified: boolean;
    needPasswordChange: boolean;
    status?: string;
    profileVerified?: boolean;
}

export interface ILoginResponse {
    token: string;
    accessToken: string;
    refreshToken: string;
    user: {
        needPasswordChange: boolean;
        name: string;
        email: string;
        role: string;
        image: string;
        isDeleted: boolean;
        emailVerified: boolean;
    }
}


export interface IRegisterResponse {
    success: boolean;
    message: string;
    user?: {
        name: string;
        email: string;
        role: string;
        emailVerified: boolean;
    }
}

export interface IVerifyEmailResponse {
    success: boolean;
    message: string;
    user?: {
        name: string;
        email: string;
        role: string;
        emailVerified: boolean;
    }
}

export interface IRefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    sessionToken: string;
}