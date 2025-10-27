import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Strong types for the generated plan
type Resource = {
  type: 'video' | 'article' | 'course' | 'book' | 'exercise' | string;
  title: string;
  url?: string;
  source?: string;
  isPaid?: boolean;
};

type Step = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  resources: Resource[];
};

type Plan = {
  title: string;
  category?: string;
  difficulty?: number;
  summary: string;
  steps: Step[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { goalTitle, goalDescription } = await req.json();
    if (!goalTitle || typeof goalTitle !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Goal title is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const systemPrompt = `You are an expert learning path generator. Create a comprehensive, structured learning plan based on the user's goal.

Your response must be a valid JSON object with this exact structure:
{
  "title": "Concise Learning Path Title (max 6 words)",
  "category": "Category of the learning goal (e.g., Programming, Language, Data Science, Business, Design, etc.)",
  "difficulty": 1-3 (1=Beginner, 2=Intermediate, 3=Advanced),
  "summary": "Brief 2-3 sentence overview",
  "steps": [
    {
      "id": "unique-step-id",
      "title": "Step Title",
      "description": "Detailed description",
      "durationMinutes": 60,
      "resources": [
        {
          "type": "video|article|course|book|exercise",
          "title": "Resource Title",
          "url": "https://example.com",
          "source": "Source Name",
          "isPaid": false
        }
      ]
    }
  ]
}

Guidelines:
- SHORT title (max 6 words)
- Category appropriate to the goal
- Difficulty 1-3 (Beginner/Intermediate/Advanced)
- 5-8 progressive steps, 3-5 resources per step
- PRIORITIZE free YouTube videos from reputable channels
- Use real, high-quality links; mix free/paid with free first
- Provide realistic time estimates`;

    const userPrompt = `Goal: ${goalTitle}${goalDescription ? `\n\nAdditional Context: ${goalDescription}` : ''}\n\nPlease generate a comprehensive learning plan with actionable steps and resources.`;

    // First, list available models to find one that works
    const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    
    if (!modelsResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch available models. Please check your API key.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const modelsData = await modelsResp.json();
    const availableModels = modelsData.models || [];
    
    // Find a generative model (prefer gemini-1.5-flash or gemini-pro)
    const generativeModel = availableModels.find((m: { name: string; supportedGenerationMethods?: string[] }) => 
      m.supportedGenerationMethods?.includes('generateContent') && 
      (m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-pro'))
    ) || availableModels.find((m: { supportedGenerationMethods?: string[] }) => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (!generativeModel) {
      return new Response(
        JSON.stringify({ error: 'No generative models available. Please check your API access.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Retry logic for handling overloaded/rate limit errors
    const maxRetries = 3;
    let aiResp: Response | null = null;
    let lastError = '';
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      aiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${generativeModel.name}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [ { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] } ],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
        }),
      });

      if (aiResp.ok) {
        break; // Success, exit retry loop
      }

      // Check if error is retryable (429, 503, 500)
      try { 
        const e = await aiResp.json(); 
        lastError = e?.error?.message || e?.message || `Gemini API error (${aiResp.status})`;
        
        // Retry on rate limit (429), server errors (500, 503), or "overloaded" message
        const isRetryable = aiResp.status === 429 || 
                           aiResp.status === 503 || 
                           aiResp.status === 500 ||
                           lastError.toLowerCase().includes('overloaded');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          const status = [429,402,400,401].includes(aiResp.status) ? aiResp.status : 502;
          return new Response(JSON.stringify({ error: lastError }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (_) { 
        lastError = `Gemini API error (${aiResp.status})`;
      }
    }

    if (!aiResp || !aiResp.ok) {
      return new Response(JSON.stringify({ error: lastError || 'Failed after retries' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiData = await aiResp.json();
    
    const contentText: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      return new Response(
        JSON.stringify({ error: 'Invalid response from AI service' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractJson = (text: string) => {
      // Try to extract JSON from markdown code blocks first
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const jsonStr = codeBlockMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      
      // Try to find JSON object in the text (without code block markers)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    };

    let parsed: Partial<Plan>;
    try {
      parsed = extractJson(contentText);
    } catch (e) {
      console.error('JSON extraction failed:', e, 'Content preview:', contentText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI generated plan. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!parsed?.title || !parsed?.summary || !Array.isArray(parsed?.steps)) {
      return new Response(JSON.stringify({ error: 'Generated plan is missing required fields' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const stepsOk = parsed.steps!.every((s: Step) =>
      typeof s?.id === 'string' && typeof s?.title === 'string' && typeof s?.description === 'string' &&
      typeof s?.durationMinutes === 'number' && Array.isArray(s?.resources)
    );
    if (!stepsOk) {
      return new Response(JSON.stringify({ error: 'Generated plan contains invalid steps' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const plan: Plan = parsed as Plan;

    // Validate YouTube links
    const isYouTubeVideoPublic = async (url: string): Promise<boolean> => {
      if (!url) return false;
      const isYT = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
      if (!isYT) return false;
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch(oembed, { signal: controller.signal });
        clearTimeout(timeout);
        return resp.ok;
      } catch (_) {
        clearTimeout(timeout);
        return false;
      }
    };

    for (const step of plan.steps) {
      const results = await Promise.all(
        step.resources.map(async (r: Resource) => {
          if (r?.type === 'video' && r?.url) {
            const ok = await isYouTubeVideoPublic(r.url);
            return ok ? r : null;
          }
          return r;
        })
      );
      step.resources = results.filter(Boolean) as Resource[];
    }

    return new Response(JSON.stringify(plan), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-study-plan-v2:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
