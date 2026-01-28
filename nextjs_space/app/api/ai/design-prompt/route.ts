import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
});

interface DesignPromptRequest {
  prompt: string;
  context?: {
    projectType?: string;
    buildingName?: string;
    constraints?: Record<string, unknown>;
  };
  mode?: 'conceptual' | 'technical' | 'materials' | 'sustainability' | 'layout';
}

const SYSTEM_PROMPT = `You are an expert architectural design AI assistant for SiteSync OS, a construction management platform. Your role is to help users conceptualize and refine architectural designs.

You excel at:
1. **Conceptual Design**: Translating user visions into architectural concepts with spatial relationships, massing, and form.
2. **Technical Specifications**: Providing specific dimensions, materials, structural considerations, and building code compliance guidance.
3. **Material Selection**: Recommending facade materials, glazing types, interior finishes, and sustainable materials based on project goals.
4. **Sustainability**: Advising on LEED certification paths, energy efficiency, passive design strategies, and net-zero approaches.
5. **Layout Optimization**: Suggesting efficient floor plans, circulation patterns, and space programming.

When responding:
- Be specific and actionable with recommendations
- Include relevant dimensions and metrics when appropriate
- Consider building codes, accessibility (ADA), and safety requirements
- Suggest parametric values that could be applied to the building generator (floors, dimensions, WWR, materials)
- Format responses with clear sections using markdown

If the user's prompt can be translated into parametric building settings, include a JSON block at the end labeled "PARAMETRIC_SUGGESTIONS" with recommended values for:
- projectType (senior-living, veteran-housing, mixed-use, commercial, residential, healthcare, educational)
- totalFloors (number)
- floorToFloorHeight (meters)
- footprintWidth (meters)
- footprintDepth (meters)
- windowToWallRatio (0-1)
- solarCoverage (0-1)
- facadeMaterial (concrete-precast, brick-red, metal-steel-dark, wood-clt, cladding-fiber-cement)
- glazingMaterial (glass-curtainwall, glass-residential, solar-bipv)
- sustainabilityTarget (LEED-Silver, LEED-Gold, LEED-Platinum, PassiveHouse, NetZero)`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DesignPromptRequest = await req.json();
    const { prompt, context, mode = 'conceptual' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build context-aware user message
    let userMessage = prompt;
    
    if (context) {
      const contextParts: string[] = [];
      if (context.projectType) contextParts.push(`Project Type: ${context.projectType}`);
      if (context.buildingName) contextParts.push(`Building Name: ${context.buildingName}`);
      if (context.constraints) {
        contextParts.push(`Current Parameters: ${JSON.stringify(context.constraints, null, 2)}`);
      }
      if (contextParts.length > 0) {
        userMessage = `Context:\n${contextParts.join('\n')}\n\nUser Request: ${prompt}`;
      }
    }

    // Add mode-specific guidance
    const modePrompts: Record<string, string> = {
      conceptual: 'Focus on conceptual design, spatial relationships, and architectural vision.',
      technical: 'Provide detailed technical specifications, dimensions, and structural considerations.',
      materials: 'Focus on material selection, finishes, and construction assemblies.',
      sustainability: 'Emphasize sustainability strategies, energy efficiency, and certification paths.',
      layout: 'Focus on floor plan optimization, space programming, and circulation.',
    };

    userMessage += `\n\nMode: ${mode} - ${modePrompts[mode] || modePrompts.conceptual}`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0]?.message?.content || '';

    // Extract parametric suggestions if present
    let parametricSuggestions = null;
    const jsonMatch = aiResponse.match(/PARAMETRIC_SUGGESTIONS[\s\S]*?```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parametricSuggestions = JSON.parse(jsonMatch[1]);
      } catch {
        // JSON parsing failed, ignore
      }
    }

    // Clean the response (remove the JSON block for display)
    const cleanedResponse = aiResponse.replace(/PARAMETRIC_SUGGESTIONS[\s\S]*?```json[\s\S]*?```/g, '').trim();

    return NextResponse.json({
      response: cleanedResponse,
      parametricSuggestions,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Design prompt error:', error);
    return NextResponse.json(
      { error: 'Failed to process design prompt' },
      { status: 500 }
    );
  }
}
