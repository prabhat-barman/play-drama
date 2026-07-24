// ------------------------------
// API base URL
// ------------------------------
// Point to the hosted Admin Backend by default.
// Override at build time via `API_URL` or `EXPO_PUBLIC_API_URL` env vars.
//
// Swagger: https://vertical-admin-backend.onrender.com/api-docs
const DEFAULT_API_URL = 'https://vertical-admin-backend.onrender.com/api/v1';

const envOverride =
  (globalThis as any).process?.env?.API_URL ??
  (globalThis as any).process?.env?.EXPO_PUBLIC_API_URL;

export const API_URL: string = envOverride ?? DEFAULT_API_URL;

// ------------------------------
// OAuth (kept for future use — backend currently exposes only email + OTP)
// ------------------------------
export const GOOGLE_WEB_CLIENT_ID: string =
  (globalThis as any).process?.env?.GOOGLE_WEB_CLIENT_ID ??
  '55460051377-uf8f5s2n6mvk0tv2ln5b87urfcm77fsg.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID: string | undefined =
  (globalThis as any).process?.env?.GOOGLE_IOS_CLIENT_ID ?? undefined;
