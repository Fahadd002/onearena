/**
 * Standard Token Expiration Times (Frontend)
 * Must match backend constants
 */

export const TOKEN_EXPIRATION = {
    // OTP expires in 2 minutes
    OTP: 2 * 60, // 120 seconds
    
    // Access token expires in 15 minutes
    ACCESS_TOKEN: 15 * 60, // 900 seconds
    
    // Refresh token expires in 7 days
    REFRESH_TOKEN: 7 * 24 * 60 * 60, // 604800 seconds
    
    // Session token expires in 24 hours
    SESSION_TOKEN: 24 * 60 * 60, // 86400 seconds
} as const;

/**
 * Time Thresholds for Token Refresh
 */
export const TOKEN_REFRESH_THRESHOLD = {
    // Refresh access token when 5 minutes or less remaining
    ACCESS_TOKEN: 5 * 60, // 300 seconds
    
    // Refresh session when 2 hours or less remaining
    SESSION_TOKEN: 2 * 60 * 60, // 7200 seconds
} as const;

/**
 * Session Management Intervals (milliseconds)
 */
export const SESSION_INTERVALS = {
    // Check session every 5 minutes
    CHECK: 5 * 60 * 1000, // 300000 ms
    
    // Check token expiration before each API call
    API_CHECK: true,
} as const;
