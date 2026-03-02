/**
 * Zod-based validation utilities for Next.js App Router API routes.
 *
 * Usage:
 *   import { validate } from '@/lib/validations';
 *   import { CreateProjectSchema } from '@/lib/validations/projects';
 *
 *   export async function POST(req: NextRequest) {
 *     const parsed = await validate(req, CreateProjectSchema);
 *     if (!parsed.ok) return parsed.error;
 *     const { name, budget } = parsed.data;
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

type ValidationOk<T> = { ok: true; data: T };
type ValidationFail = { ok: false; error: NextResponse };

export type ValidationResult<T> = ValidationOk<T> | ValidationFail;

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate the JSON body of a NextRequest against a Zod schema.
 * Returns a discriminated union so callers can early-return on failure:
 *
 *   const parsed = await validate(req, MySchema);
 *   if (!parsed.ok) return parsed.error;   // 400 JSON response
 *   const data = parsed.data;              // fully-typed
 */
export async function validate<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: 'Validation failed',
          details: formatZodErrors(result.error),
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

/**
 * Validate an already-parsed plain object (e.g. from URL search params).
 */
export function validateObject<T>(
  input: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: 'Validation failed',
          details: formatZodErrors(result.error),
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Error formatter
// ---------------------------------------------------------------------------

function formatZodErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_root';
    if (!out[path]) out[path] = [];
    out[path].push(issue.message);
  }
  return out;
}
