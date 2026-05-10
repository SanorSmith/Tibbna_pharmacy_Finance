import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChatSDKError, type ErrorCode } from "./errors";

import { genSaltSync, hashSync } from "bcrypt-ts";

export function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export async function redirect(url: string) {
  window.location.href = url;
}

// Helper function to open Stripe Billing Portal in new tab
export async function redirectNewTab(
  url: string,
  onReturn?: () => void, // Callback when user returns (for refreshing data)
) {
  const portalWindow = window.open(url, "_blank");

  // Optional: Listen for when user returns to refresh data
  if (onReturn && portalWindow) {
    const checkClosed = setInterval(() => {
      if (portalWindow.closed) {
        clearInterval(checkClosed);
        onReturn();
      }
    }, 1000);

    // Cleanup after 30 minutes to prevent memory leaks
    setTimeout(
      () => {
        clearInterval(checkClosed);
      },
      30 * 60 * 1000,
    );
  }
}
