import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { GET_FILE_URL } from "@/lib/api/config";

export function getFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (!GET_FILE_URL) return null;
  const apiOrigin = GET_FILE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
}

export function getFileType(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.toLowerCase().includes(".pdf")) return "application/pdf";
  if (url.toLowerCase().match(/\.(jpg|jpeg|png)$/)) return "image/jpeg";
  return null;
}

export function isPdfFile(fileType: string | null): boolean {
  return fileType === "application/pdf";
}
