const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!configuredApiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, "");

export const API_ENDPOINTS = {
    marketplace: {
        turfs: "/turfs",
        bookings: "/bookings",
        categories: "/categories",
        categoryDropdown: "/category-dropdown",
        adminDropdown: "/user-dropdown",
        facilities: "/facilities",
        commissionRules: "/commission-rules",
        userDashboard: "/dashboard",
        ownerDashboard: "/owner/dashboard",
        managerDashboard: "/manager/dashboard",
        adminDashboard: "/admin/dashboard",
        invoices: "/invoices",
        commissions: "/commissions",
        reviews: "/reviews",
        reviewHide: "/reviews/:reviewId/hide",
        reviewUnhide: "/reviews/:reviewId/unhide",
        reviewReply: "/reviews/:reviewId/reply",
        users: "/users",
        ownerTurfs: "/owner/turfs",
        ownerPackages: "/owner/packages",
        ownerPricing: "/owner/pricing",
        ownerSlots: "/owner/slots",
        managers: "/owner/managers",
        superAdminTurfs: "/super-admin/turfs",
        refunds: "/refunds",
        payouts: "/payouts",
        adminBookings: "/admin/bookings",
    },
     subscription: {
        plans: "/subscription-plans",
    },
    auth: {
        register: "/auth/register",
        login: "/auth/login",
        me: "/auth/me",
        refreshToken: "/auth/refresh-token",
        changePassword: "/auth/change-password",
        logout: "/auth/logout",
        verifyEmail: "/auth/verify-email",
        forgotPassword: "/auth/forget-password",
        resetPassword: "/auth/reset-password",
        resendVerificationOtp: "/auth/resend-verification-otp",
        googleLogin: "/auth/login/google",
        ownerProfile: "/owner-profile",
        ownerProfileSubmit: "/owner-profile/submit",
        ownerApplications: "/owner-applications",
    },
} as const;
