/**
 * POST /api/integrations/kimi/v1/prompt-to-layout
 * Convert natural language description to structured layout specification
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { convertPromptToLayout } from '@/lib/kimi-spatial';

export const maxDuration = 60;

// Input sanitization for prompt
function sanitizePrompt(prompt: string): string {
  // Limit length and remove potential injection patterns
  return prompt
    .slice(0, 5000)
    .replace(/\bignore\s+(all\s+)?(previous|above|prior)\s+instructions?\b/gi, '')
    .replace(/\bsystem\s*:\s*/gi, '')
    .replace(/```/g, '');
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: prompt (string)' },
        { status: 400 }
      );
    }

    // Sanitize the user prompt
    const sanitizedPrompt = sanitizePrompt(body.prompt);
    
    if (sanitizedPrompt.length < 10) {
      return NextResponse.json(
        { error: 'Prompt too short. Please provide a more detailed description.' },
        { status: 400 }
      );
    }

    const units = body.units === 'imperial' ? 'imperial' : 'metric';  // Strict validation
    
    const result = await convertPromptToLayout(sanitizedPrompt, units);

    return NextResponse.json({
      success: true,
      layout_spec: result.layoutSpec,
      // NOTE: raw_response removed to prevent information disclosure
    });
  } catch (error) {
    console.error('Prompt to layout conversion error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('ABACUSAI_API_KEY')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }
    
    // Return generic error to prevent information disclosure
    return NextResponse.json(
      { error: 'Failed to generate layout. Please try a different description.' },
      { status: 500 }
    );
  }
}
