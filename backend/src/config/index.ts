import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    salt_round: process.env.SALT_ROUND,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    betterAuthUrl: process.env.BETTER_AUTH_URL as string,
    frontendUrl: process.env.FRONTEND_URL as string,
    betterAuthtSecret: process.env.BETTER_AUTH_SECRET,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    betterAuthSessionTokenExpiresIn: process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN,
    betterAuthSessionTokenUpdateAge: process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE,
    emailSenderSmtpUser: process.env.EMAIL_SENDER_SMTP_USER,
    emailSenderSmtpPass: process.env.EMAIL_SENDER_SMTP_PASS,
    emailSenderSmtpHost: process.env.EMAIL_SENDER_SMTP_HOST,
    emailSenderSmtpPort: process.env.EMAIL_SENDER_SMTP_PORT,
    emailSenderFrom: process.env.EMAIL_SENDER_FROM,
    googleClientId: process.env.GOOGLE_CLIENT_ID as string,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL as string,
    bookingPaymentTimeout: process.env.BOOKING_PAYMENT_TIMEOUT_MINUTES,
    bookingAdvancePercentage: process.env.BOOKING_ADVANCE_PERCENTAGE,
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        expires_in: process.env.EXPIRES_IN,
        refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
        refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
        reset_pass_secret: process.env.RESET_PASS_TOKEN,
        reset_pass_token_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN
    },
    reset_pass_link: process.env.RESET_PASS_LINK,
    emailSender: {
        email: process.env.EMAIL,
        app_pass: process.env.APP_PASS
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    }

}