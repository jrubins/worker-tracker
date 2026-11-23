import { ApiErrorSchema } from '@app/shared';
import type { z } from 'zod';
import { env } from './env';

/** A failed API call, carrying the API's error code (see ApiErrorSchema in @app/shared). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Calls the API (as the signed-in user, by the session cookie) and validates the response with a shared Zod schema, so a
 * contract mismatch fails loudly here instead of deep in the UI. Pass `null` as the schema for
 * empty responses.
 */
export async function apiRequest<T extends z.ZodType | null>(
  path: string,
  schema: T,
  init: RequestInit = {},
): Promise<T extends z.ZodType ? z.infer<T> : void> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  // Same-origin (the API is served at /api), so the session cookie is sent automatically.
  const res = await fetch(`${env.apiUrl}${path}`, { ...init, headers, credentials: 'same-origin' });

  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiRequestError(res.status, code, message, details);
    }
    throw new ApiRequestError(res.status, 'http_error', `Request failed with status ${res.status}`);
  }

  if (schema === null) return undefined as never;
  return schema.parse(await res.json()) as never;
}
