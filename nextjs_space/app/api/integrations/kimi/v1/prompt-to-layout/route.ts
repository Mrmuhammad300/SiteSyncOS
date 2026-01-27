/**
 * POST /api/integrations/kimi/v1/prompt-to-layout
 * Convert natural language description to structured layout specification
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { convertPromptToLayout } from '@/lib/kimi-spatial';

export const maxDuration = 60;

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

    const units = body.units || 'metric';
    
    const result = await convertPromptToLayout(body.prompt, units);

    return NextResponse.json({
      success: true,
      layout_spec: result.layoutSpec,
      raw_response: result.rawResponse,
    });
  } catch (error) {
    console.error('Prompt to layout conversion error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('ABACUSAI_API_KEY')) {
      return NextResponse.json(
        { error: 'LLM API not configured. Please check server configuration.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
