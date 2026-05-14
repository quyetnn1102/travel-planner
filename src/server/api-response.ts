import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export type ApiResult<T> = {
  data: T;
};

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResult<T>>({ data }, init);
}

export function fail(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status });
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export type ParamsContext<T extends Record<string, string>> = {
  params: Promise<T>;
};
