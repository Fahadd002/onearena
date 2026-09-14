import status from "http-status"
import { TErrorResponse, TErrorSources } from "../../app/interfaces/error.interface"
import { Prisma } from "../../generated/prisma/client"

const getStatusCodeFromPrismaError = (errorCode: string): number => {

    //P2002: Unique constraint failed
    if (errorCode === "P2002") {
        return status.CONFLICT
    }

    // P2025, P2001, P2015, P2018 : Not Found errors
    if (["P2025", "P2001", "P2015", "P2018"].includes(errorCode)) {
        return status.NOT_FOUND
    }

    // P1000 , P6002 : DB Authentication errors = 401 Unauthorized
    if (["P1000", "P6002"].includes(errorCode)) {
        return status.UNAUTHORIZED
    }

    // P1010 , P6010 : Access denied errors = 403 Forbidden
    if (["P1010", "P6010"].includes(errorCode)) {
        return status.FORBIDDEN
    }

    // P6003 : Prisma Accelararate Plan limit exceeded = 402 Payment Required
    if (errorCode === "P6003") {
        return status.PAYMENT_REQUIRED
    }

    // P1008, 2004, 6004 : Timeout errors = 504 Gateway Timeout
    if (["P1008", "P2004", "P6004"].includes(errorCode)) {
        return status.GATEWAY_TIMEOUT
    }

    // P5011 : Rate Limit Exceeded = 429 Too Many Requests
    if (errorCode === "P5011") {
        return status.TOO_MANY_REQUESTS
    }

    // P6009 Response size limit exceeded = 413 Payload Too Large
    if (errorCode === "P6009") {
        return 413
    }

    // P1xxx , P2024, P2037, P6008 : Connection errors
    if(errorCode.startsWith("P1") || ["P2024", "P2037", "P6008"].includes(errorCode)) {
        return status.SERVICE_UNAVAILABLE
    }

    // P2XXX : except unhandled errors, Bad Request
    if (errorCode.startsWith("P2")) {
        return status.BAD_REQUEST
    }

    // P3XXX, P4XXX : Internal Server Errors
    if (errorCode.startsWith("P3") || errorCode.startsWith("P4")) {
        return status.INTERNAL_SERVER_ERROR
    }

    return status.INTERNAL_SERVER_ERROR
}

const getConstraintFields = (meta?: Record<string, unknown>): string[] => {
    const target = meta?.target;
    if (Array.isArray(target)) return target.map(String);
    if (typeof target === 'string') return [target];
    return [];
};

const getKnownRequestMessage = (error: Prisma.PrismaClientKnownRequestError): string => {
    const fields = getConstraintFields(error.meta);
    const fieldLabel = fields.join(', ');

    switch (error.code) {
        case 'P2002':
            return fields.includes('email')
                ? 'An account with this email address already exists.'
                : fieldLabel
                    ? `A record with this ${fieldLabel} already exists.`
                    : 'A record with the same unique value already exists.';
        case 'P2000': return fieldLabel ? `${fieldLabel} is too long.` : 'One of the provided values is too long.';
        case 'P2003': return 'This operation references a record that does not exist.';
        case 'P2011': return fieldLabel ? `${fieldLabel} is required.` : 'A required value is missing.';
        case 'P2012': return fieldLabel ? `${fieldLabel} is required.` : 'A required value is missing.';
        case 'P2014': return 'This operation would break a required relationship.';
        case 'P2025':
        case 'P2001':
        case 'P2015': return 'The requested record was not found.';
        case 'P2016': return 'The database could not process the provided data.';
        case 'P2017': return 'The related records are not connected.';
        case 'P2018': return 'A required related record was not found.';
        case 'P2019': return 'The provided query input is invalid.';
        case 'P2020': return 'One of the provided values is outside the allowed range.';
        case 'P2021': return 'A required database table is unavailable.';
        case 'P2022': return 'A required database column is unavailable.';
        case 'P2024': return 'The database is temporarily busy. Please try again.';
        case 'P2034': return 'This request conflicted with another operation. Please try again.';
        case 'P2037': return 'The database is temporarily unavailable. Please try again.';
        default: return 'The database could not complete this request.';
    }
};

export const handlePrismaClientKnownRequestError = (error: Prisma.PrismaClientKnownRequestError) : TErrorResponse => {
    const message = getKnownRequestMessage(error);
    const fields = getConstraintFields(error.meta);

    return {
        success: false,
        statusCode: getStatusCodeFromPrismaError(error.code),
        message,
        errorSources: [{
            path: fields[0] ?? 'database',
            message,
        }],
    };
}

export const handlePrismaClientUnknownError = (error: Prisma.PrismaClientUnknownRequestError) : TErrorResponse => {
    let cleanMessage = error.message;

    // Remove the "Invalid `prisma.user.create()` invocation: " part from the message for better readability
    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "")

    const lines = cleanMessage.split("\n").filter(line => line.trim());
    const mainMessage = lines[0] || "An unknown error occurred with the database operation."

    const errorSources : TErrorSources[] = [
        {
         path: "Unknown Prisma Error",
         message: mainMessage
        }
    ]

    return {
        success: false,
        statusCode: status.INTERNAL_SERVER_ERROR,
        message: `Prisma Client Unknown Request Error: ${mainMessage}`,
        errorSources,
    }
}

export const handlePrismaClientValidationError = (error: Prisma.PrismaClientValidationError) : TErrorResponse => {
    let cleanMessage = error.message;

    // Remove the "Invalid `prisma.user.create()` invocation: " part from the message for better readability
    cleanMessage = cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "")

    const lines = cleanMessage.split("\n").filter(line => line.trim());

    const errorSources : TErrorSources[] = [];

    // extract field name for field-specific validation errors
    // Example message: "Argument `data.email`: Got invalid value `invalid-email` on prisma.user.create()"
    const fieldMatch = cleanMessage.match(/Argument `(\w+)`/i);
    const fieldName = fieldMatch ? fieldMatch[1] : "Unknown Field";

    //main message

    const mainMessage = lines.find(line => 
        !line.includes("Argument") &&
        !line.includes("→") &&
        line.length > 10
    ) || lines[0] ||"Invalid query parameters provided to the database operation."

    errorSources.push({
        path: fieldName,
        message: mainMessage
    })

    return {
        success: false,
        statusCode: status.BAD_REQUEST,
        message: `Prisma Client Validation Error: ${mainMessage}`,
        errorSources,
    }
}

export const handlerPrismaClientInitializationError = (error: Prisma.PrismaClientInitializationError) : TErrorResponse => {
    const statusCode = error.errorCode ? getStatusCodeFromPrismaError(error.errorCode) : status.SERVICE_UNAVAILABLE

    const cleanMessage = error.message;

    cleanMessage.replace(/Invalid `.*?` invocation:?\s*/i, "")

    const lines = cleanMessage.split("\n").filter(line => line.trim());

    const mainMessage = lines[0] || "An error occurred while initializing the Prisma Client."

    const errorSources : TErrorSources[] = [
        {
            path: error.errorCode || "Initialization Error",
            message: mainMessage
        }
    ]

    return {
        success: false,
        statusCode,
        message: `Prisma Client Initialization Error: ${mainMessage}`,
        errorSources,
    }
}


export const handlerPrismaClientRustPanicError = () : TErrorResponse => {
    const errorSources : TErrorSources[] = [{
        path : "Rust Engine Crashed",
        message : "The database engine encountered a fatal error and crashed. This is usually due to an internal bug in the Prisma engine or an unexpected edge case in the database operation. Please check the Prisma logs for more details and consider reporting this issue to the Prisma team if it persists."
    }]

    return {
        success: false,
        statusCode: status.INTERNAL_SERVER_ERROR,
        message: "Prisma Client Rust Panic Error: The database engine crashed due to a fatal error.",
        errorSources,
    }
}
