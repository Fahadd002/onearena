const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const fileUrl = process.env.NEXT_PUBLIC_GET_FILE_URL;

if (!configuredApiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, "");
export const GET_FILE_URL = (fileUrl || "").replace(/\/$/, "");

export const SERVER_API_BASE_URL = (process.env.INTERNAL_API_BASE_URL || API_BASE_URL).replace(/\/$/, "");

export const API_ENDPOINTS = {
    marketplace: {
        turfs: "/turfs",
        categories: "/categories",
        categoryDropdown: "/category-dropdown",
        adminDropdown: "/user-dropdown",
        facilities: "/facilities",
        userDashboard: "/dashboard",
        ownerDashboard: "/owner/dashboard",
        managerDashboard: "/manager/dashboard",
        adminDashboard: "/admin/dashboard",
        invoices: "/invoices",
        reviews: "/reviews",
        reviewEligibility: "/bookings/:bookingId/reviews/eligibility",
        reviewCreate: "/bookings/:bookingId/reviews",
        reviewHide: "/reviews/:reviewId/hide",
        reviewUnhide: "/reviews/:reviewId/unhide",
        reviewReply: "/reviews/:reviewId/reply",
        users: "/users",
        usersSearch: "/users/search",
        usersByPhone: "/users/by-phone",

        ownerSlotTime: "/owner/slot-times",
        ownerSlotTimeDropdown: "/owner/slot-times/dorpdown",
        ownerTurfs: "/owner/turfs",
        ownerPackages: "/owner/packages",
        ownerPricing: "/owner/pricing",
        ownerSlots: "/owner/slots",
        managers: "/owner/managers",
        superAdminTurfs: "/super-admin/turfs",
        refunds: "/refunds",
        payouts: "/payouts",
        
        bookings: "/bookings",
        adminBookings: "/admin/bookings",
        ownerContent: "/owner/content",
        ownerLanding: "/owners/:ownerId/landing",
    },
    subscription: {
        // Super Admin — plans
        plansPricing: "/plans-pricing",
        allSubscription: "/all-subscriptions",
        

        // Public / Owner plans
        subsCriptionPlans: "/subscription-plans",
        mySubscription: "/my-subscription",
        planById: "/subscription-plans/:planId",

        // Super Admin — subscriptions
        takeCashPaymentForSubscription: "/subscriptions/:subscriptionId/take-cash-payment",
        confirmOnlinePaymentForSubscription: "/subscriptions/:subscriptionId/confirm-online-payment",
        updateSubcriptionBySuperAdmin: "/subscriptions/super-admin/:subscriptionId",
        
        // Subscription payment (owner-initiated)
        paymentInitiate: "/subscription/payment/initiate",
        paymentVerify: "/subscription/payment/verify",

    },
    auth: {
        register: "/auth/register",
        login: "/auth/login",
        me: "/auth/me",
        refreshToken: "/auth/refresh-token",
        changePassword: "/auth/change-password",
        logout: "/auth/logout",
        verifyEmail: "/auth/verify-email",
        setupEmail: "/auth/phone-login/setup-email",
        forgotPassword: "/auth/forget-password",
        resetPassword: "/auth/reset-password",
        resendVerificationOtp: "/auth/resend-verification-otp",
        googleLogin: "/auth/login/google",
        ownerProfile: "/owner-profile",
        ownerProfileSubmit: "/owner-profile/submit",
        ownerApplications: "/owner-applications",
        userProfileImage: "/auth/user/profile/image",
        userProfile: "/auth/user/profile",
    },
    payments: {
        invoices: "/invoices",
        invoiceByBooking: "/bookings/:bookingId/invoice",
        invoicePayments: "/invoices/:invoiceId/payments",
        paymentStatus: "/payments/:paymentId/status",
    },
} as const;
