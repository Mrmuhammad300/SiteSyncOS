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
  style?: 'photorealistic' | 'architectural-render' | 'sketch' | 'blueprint' | '3d-visualization';
  context?: {
    projectType?: string;
    buildingName?: string;
    constraints?: Record<string, unknown>;
  };
  generateImage?: boolean;
}

const STYLE_PROMPTS: Record<string, string> = {
  'photorealistic': 'photorealistic architectural photography, professional lighting, high detail, 8k resolution',
  'architectural-render': 'professional architectural rendering, clean lines, modern visualization, studio quality',
  'sketch': 'architectural concept sketch, hand-drawn style, pencil and ink, design development drawing',
  'blueprint': 'technical architectural blueprint style, detailed floor plan visualization, engineering drawing aesthetic',
  '3d-visualization': '3D architectural visualization, isometric view, detailed building model, professional CGI render',
};

const ANALYSIS_SYSTEM_PROMPT = `You are an expert architectural design consultant for SiteSync OS. Your role is to:
1. Analyze the user's design request and extract key architectural elements
2. Provide a brief analysis of the design concept (2-3 sentences)
3. Suggest parametric values if applicable

Respond in JSON format:
{
  "analysis": "Brief analysis of the design concept",
  "keyElements": ["element1", "element2", ...],
  "imagePrompt": "Enhanced, detailed prompt optimized for architectural image generation",
  "parametricSuggestions": { ... } // optional
}`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DesignPromptRequest = await req.json();
    const { prompt, style = 'architectural-render', context, generateImage = true } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build context string
    let contextStr = '';
    if (context) {
      const parts: string[] = [];
      if (context.projectType) parts.push(`Project Type: ${context.projectType}`);
      if (context.buildingName) parts.push(`Building: ${context.buildingName}`);
      if (context.constraints) {
        const c = context.constraints;
        if (c.totalFloors) parts.push(`${c.totalFloors} floors`);
        if (c.footprintWidth && c.footprintDepth) parts.push(`${c.footprintWidth}m x ${c.footprintDepth}m footprint`);
        if (c.sustainabilityTarget) parts.push(`${c.sustainabilityTarget} certification target`);
      }
      if (parts.length > 0) contextStr = `\nContext: ${parts.join(', ')}`;
    }

    // Step 1: Analyze the prompt and generate enhanced image prompt
    const analysisResponse = await client.chat.completions.create({
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: `Design Request: ${prompt}${contextStr}` },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    let analysis = '';
    let keyElements: string[] = [];
    let enhancedImagePrompt = prompt;
    let parametricSuggestions = null;

    try {
      const analysisContent = analysisResponse.choices[0]?.message?.content || '{}';
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = analysisContent.match(/```json\s*([\s\S]*?)```/) || 
                        analysisContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisContent;
      const parsed = JSON.parse(jsonStr);
      
      analysis = parsed.analysis || '';
      keyElements = parsed.keyElements || [];
      enhancedImagePrompt = parsed.imagePrompt || prompt;
      parametricSuggestions = parsed.parametricSuggestions || null;
    } catch {
      // If parsing fails, use the original prompt
      analysis = 'Generating visualization based on your description.';
      enhancedImagePrompt = prompt;
    }

    // Step 2: Generate the architectural image
    let imageUrl = null;
    let imageError = null;

    if (generateImage) {
      const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['architectural-render'];
      const fullImagePrompt = `${enhancedImagePrompt}, ${stylePrompt}, architectural design, professional quality, detailed building visualization`;

      try {
        // Use the images.generate endpoint for image generation
        const imageResponse = await client.images.generate({
          model: 'gpt-image-1',
          prompt: fullImagePrompt,
          n: 1,
          size: '1024x1024',
        });

        // Extract image URL from response
        if (imageResponse.data && imageResponse.data.length > 0) {
          const imageData = imageResponse.data[0];
          if (imageData.url) {
            imageUrl = imageData.url;
          } else if (imageData.b64_json) {
            // If base64, create a data URL
            imageUrl = `data:image/png;base64,${imageData.b64_json}`;
          }
        }
      } catch (error) {
        console.error('Image generation error:', error);
        imageError = 'Image generation encountered an issue. Please try again.';
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      keyElements,
      imageUrl,
      imageError,
      enhancedPrompt: enhancedImagePrompt,
      style,
      parametricSuggestions,
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
