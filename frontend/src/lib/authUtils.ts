export type UserRole = "SUPER_ADMIN" | "USER" | "MANAGER" | "ADMIN";

export const authRoutes = [ "/login", "/register", "/forgot-password", "/reset-password", "/verify-email" ];

export const isAuthRoute = (pathname : string) => {
    return authRoutes.some((router : string) => router === pathname);
}

export type RouteConfig = {
    exact : string[],
    pattern : RegExp[]
}

export const commonProtectedRoutes : RouteConfig = {
    exact : ["/my-profile", "/change-password"],
    pattern : []
}

export const adminProtectedRoutes : RouteConfig = {
    pattern: [/^\/admin\/dashboard/, /^\/owner-profile/ ],
    exact : ["/owner-profile"]
}

export const superAdminProtectedRoutes : RouteConfig = {
    pattern: [/^\/super-admin\/dashboard/ ],
    exact : []
}

export const managerProtectedRoutes : RouteConfig = {
    pattern: [/^\/manager\/dashboard/ ],
    exact : []
}
export const regularUserProtectedRoutes : RouteConfig = {
    pattern: [/^\/user\/dashboard/ ],
    exact : []
};

export const isRouteMatches = (pathname : string, routes : RouteConfig) => {
    if(routes.exact.includes(pathname)) {
        return true;
    }
    return routes.pattern.some((pattern : RegExp) => pattern.test(pathname));
}

export const getRouteOwner = (pathname : string) : "SUPER_ADMIN" | "USER" | "MANAGER" | "ADMIN" | "COMMON" | null => {
    if(isRouteMatches(pathname, adminProtectedRoutes)) {
        return "ADMIN";
    }

    if (isRouteMatches(pathname, superAdminProtectedRoutes)) {
        return "SUPER_ADMIN";
    }

    if(isRouteMatches(pathname, managerProtectedRoutes)) {
        return "MANAGER";
    }
    
    if(isRouteMatches(pathname, regularUserProtectedRoutes)) {
        return "USER";
    }

    if(isRouteMatches(pathname, commonProtectedRoutes)) {
        return "COMMON";
    }

    return null;
}

export const getDefaultDashboardRoute = (role : UserRole) => {
    if( role === "SUPER_ADMIN") {
        return "/super-admin/dashboard";
    }
    if(role === "ADMIN") {
        return "/admin/dashboard";
    }
    if(role === "MANAGER") {
        return "/manager/dashboard";
    }
    if(role === "USER") {
        return "/user/dashboard";
    }

    return "/";
}

export const isValidRedirectForRole = (redirectPath : string, role : UserRole) => {
    const unifySuperAdminRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : role;

    role = unifySuperAdminRole;

    const routeOwner = getRouteOwner(redirectPath);

    if(routeOwner === null || routeOwner === "COMMON"){
        return true;
    }

    if(routeOwner === role){
        return true;
    }

    return false;
}