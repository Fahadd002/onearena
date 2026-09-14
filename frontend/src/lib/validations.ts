export function validatePrice(value: string): { valid: boolean; message?: string } {
    if (value === "") {
        return { valid: false, message: "Price is required" };
    }
    if (!/^\d*\.?\d*$/.test(value)) {
        return { valid: false, message: "Price must be a number" };
    }
    const num = Number(value);
    if (isNaN(num)) {
        return { valid: false, message: "Price must be a number" };
    }
    if (num < 0) {
        return { valid: false, message: "Price cannot be negative" };
    }
    return { valid: true };
}

export function sanitizePrice(value: string): string {
    return value.replace(/[^0-9.]/g, "");
}
