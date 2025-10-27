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

// Fallback generator to guarantee a response during demos if the AI is overloaded
function buildFallbackPlan(goalTitle: string, goalDescription?: string): Plan {
  const safeTitle = goalTitle.length > 60 ? goalTitle.slice(0, 57) + '...' : goalTitle;
  const makeStep = (i: number, title: string, minutes: number): Step => ({
    id: `fallback-${i}`,
    title: `Step ${i}: ${title}`,
    description: `Work through this step using curated search results and reputable free resources. Focus on understanding and note-taking. ${goalDescription ? 'Context: ' + goalDescription : ''}`,
    durationMinutes: minutes,
    // Use article/exercise types to avoid video validation HTTP checks
    resources: [
      { type: 'article', title: `${title} — Overview`, url: `https://www.google.com/search?q=${encodeURIComponent(title)}` },
      { type: 'article', title: `${title} — Beginner friendly`, url: `https://duckduckgo.com/?q=${encodeURIComponent(title + ' beginner')}` },
      { type: 'exercise', title: `${title} — Practice tasks`, url: `https://www.google.com/search?q=${encodeURIComponent(title + ' exercises')}` },
    ],
  });

  const base = safeTitle.replace(/^(Learn|Master|Study)\s+/i, '').trim();
  const steps = [
    makeStep(1, `${base} fundamentals`, 45),
    makeStep(2, `Core concepts of ${base}`, 60),
    makeStep(3, `${base} applied examples`, 60),
    makeStep(4, `Projects with ${base}`, 75),
    makeStep(5, `Review and next steps`, 30),
  ];

  return {
    title: `${base} Learning Path (Fallback)`,
    category: 'Self-paced',
    difficulty: 1,
    summary: `Fallback learning path generated locally to ensure a smooth demo when the AI service is busy. You can still follow these steps and links while the model recovers.`,
    steps,
  };
}

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
    
    // Prefer lighter/less busy models first to avoid overload during demos
    const preferredOrder = [
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro',
    ];

    const byPreference = availableModels.find((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes('generateContent') && preferredOrder.some(p => m.name.includes(p))
    );

    // Fallback to any model that supports generateContent
    const generativeModel = byPreference || availableModels.find((m: { supportedGenerationMethods?: string[] }) => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (!generativeModel) {
      return new Response(
        JSON.stringify({ error: 'No generative models available. Please check your API access.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Retry logic for handling overloaded/rate limit errors
    const maxRetries = 5;
    let aiResp: Response | null = null;
    let lastError = '';
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter: 2s, 4s, 8s, 16s, 32s (+0-300ms)
        const jitter = Math.floor(Math.random() * 300);
        const delay = Math.pow(2, attempt) * 1000 + jitter;
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
          // If we've exhausted retries or error is not retryable, return a graceful fallback plan instead of erroring out
          const fallback = buildFallbackPlan(goalTitle, goalDescription);
          return new Response(JSON.stringify(fallback), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (_) { 
        lastError = `Gemini API error (${aiResp.status})`;
      }
    }

    if (!aiResp || !aiResp.ok) {
      // Final guard: still produce a plan for the demo
      const fallback = buildFallbackPlan(goalTitle, goalDescription);
      return new Response(JSON.stringify(fallback), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Advanced resource validation - check if URLs are actually accessible
    const validateResourceUrl = async (url: string | undefined, type: string): Promise<boolean> => {
      if (!url) return false;
      
      try {
        // YouTube validation
        if (type === 'video' || /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
          const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const resp = await fetch(oembed, { signal: controller.signal });
            clearTimeout(timeout);
            return resp.ok;
          } catch (_) {
            clearTimeout(timeout);
            return false;
          }
        }
        
        // For articles, courses, books - do HEAD request to check if URL exists
        if (type === 'article' || type === 'course' || type === 'book') {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          try {
            const resp = await fetch(url, { 
              method: 'HEAD', 
              signal: controller.signal,
              redirect: 'follow'
            });
            clearTimeout(timeout);
            // Accept 2xx and 3xx responses as valid
            return resp.ok || (resp.status >= 300 && resp.status < 400);
          } catch (_) {
            clearTimeout(timeout);
            // If HEAD fails, try GET with range to minimize data transfer
            try {
              const resp = await fetch(url, {
                method: 'GET',
                headers: { 'Range': 'bytes=0-0' },
                signal: controller.signal,
                redirect: 'follow'
              });
              clearTimeout(timeout);
              return resp.ok || resp.status === 206 || (resp.status >= 300 && resp.status < 400);
            } catch {
              clearTimeout(timeout);
              return false;
            }
          }
        }
        
        // For exercise type or unknown, accept if it looks like a valid URL
        return /^https?:\/\/.+\..+/.test(url);
      } catch (error) {
        console.error(`Error validating URL ${url}:`, error);
        return false;
      }
    };

    // Validate all resources in parallel for each step
    for (const step of plan.steps) {
      const validationPromises = step.resources.map(async (r: Resource) => {
        if (!r?.url) return r; // Keep resources without URLs (might be books, etc.)
        
        const isValid = await validateResourceUrl(r.url, r.type);
        return isValid ? r : null;
      });
      
      const results = await Promise.all(validationPromises);
      step.resources = results.filter(Boolean) as Resource[];
      
      // Ensure at least 1 resource per step, add a search link if all were filtered
      if (step.resources.length === 0) {
        step.resources.push({
          type: 'article',
          title: `${step.title} - Curated Resources`,
          url: `https://www.google.com/search?q=${encodeURIComponent(step.title)}`,
          source: 'Google Search',
          isPaid: false
        });
      }
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
