export const BD_PHONE_RE = /^01[3-9]\d{8}$/;

export const validateBangladeshiMobile = (v: string) => {
  if (!v) return null;
  return BD_PHONE_RE.test(v.trim()) ? null : "Enter a valid 11-digit number.";
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (v: string) => v ? (EMAIL_RE.test(v.trim()) ? null : "Enter a valid email address") : null;

export const formatBangladeshiMobile = (v: string) => v.trim();
