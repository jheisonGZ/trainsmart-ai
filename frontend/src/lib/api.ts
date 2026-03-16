import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from "./supabaseClient";
import type { ApiSuccessResponse } from "../types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type QueryValue = string | number | boolean | null | undefined;
type AccessTokenGetter = () => Promise<string | null>;

const inflightGetRequests = new Map<string, Promise<unknown>>();
const cachedGetResponses = new Map<
  string,
  { expiresAt: number; data: unknown }
>();
const DEFAULT_GET_CACHE_TTL_MS = 10_000;
let cacheGeneration = 0;

let accessTokenGetter: AccessTokenGetter = async () => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  query?: Record<string, QueryValue>;
  auth?: boolean;
  cacheTtlMs?: number | false;
}

type GetRequestOptions = Omit<RequestOptions, "method" | "body" | "query">;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/api") ? path : `/api${path}`;

  if (!query) {
    return normalizedPath;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

export function setApiAccessTokenGetter(getter: AccessTokenGetter) {
  accessTokenGetter = getter;
}

export function clearApiClientState() {
  cacheGeneration += 1;
  inflightGetRequests.clear();
  cachedGetResponses.clear();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const method = options.method ?? "GET";
  const requestUrl = buildUrl(path, options.query);
  const requestKey = `${method}:${options.auth === false ? "public" : "auth"}:${requestUrl}`;

  const executeRequest = async () => {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth !== false) {
      const token = await accessTokenGetter();

      if (!token) {
        throw new ApiClientError(
          isSupabaseConfigured
            ? "No hay una sesion operativa de Supabase disponible."
            : supabaseConfigError,
          isSupabaseConfigured ? 401 : 500,
        );
      }

      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(requestUrl, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const payload = (await response
      .json()
      .catch(() => null)) as ApiSuccessResponse<T> | { error?: string; details?: unknown } | null;

    if (!response.ok) {
      throw new ApiClientError(
        payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `Request failed with status ${response.status}.`,
        response.status,
        payload && "details" in payload ? payload.details : undefined,
      );
    }

    if (!payload || !("success" in payload) || payload.success !== true) {
      throw new ApiClientError("Unexpected API response format.", response.status);
    }

    return payload.data;
  };

  if (method === "GET") {
    const cacheTtlMs =
      options.cacheTtlMs === false
        ? false
        : options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
    const requestGeneration = cacheGeneration;

    if (cacheTtlMs !== false) {
      const cached = cachedGetResponses.get(requestKey);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }

      if (cached) {
        cachedGetResponses.delete(requestKey);
      }
    }

    const inflightRequest = inflightGetRequests.get(requestKey);

    if (inflightRequest) {
      return inflightRequest as Promise<T>;
    }

    const requestPromise = executeRequest()
      .then((data) => {
        if (cacheTtlMs !== false && requestGeneration === cacheGeneration) {
          cachedGetResponses.set(requestKey, {
            data,
            expiresAt: Date.now() + cacheTtlMs,
          });
        }

        return data;
      })
      .finally(() => {
        inflightGetRequests.delete(requestKey);
      });

    inflightGetRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  cacheGeneration += 1;
  inflightGetRequests.clear();
  cachedGetResponses.clear();
  return executeRequest();
}

export const api = {
  get<T>(
    path: string,
    query?: Record<string, QueryValue>,
    options?: GetRequestOptions,
  ) {
    return apiRequest<T>(path, { method: "GET", query, ...options });
  },
  getFresh<T>(path: string, query?: Record<string, QueryValue>) {
    return apiRequest<T>(path, { method: "GET", query, cacheTtlMs: false });
  },
  post<T>(path: string, body?: unknown, query?: Record<string, QueryValue>) {
    return apiRequest<T>(path, { method: "POST", body, query });
  },
  put<T>(path: string, body?: unknown, query?: Record<string, QueryValue>) {
    return apiRequest<T>(path, { method: "PUT", body, query });
  },
  delete<T>(path: string, query?: Record<string, QueryValue>) {
    return apiRequest<T>(path, { method: "DELETE", query });
  },
};
