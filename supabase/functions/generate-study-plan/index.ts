import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goalTitle, goalDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert learning path generator. Create a comprehensive, structured learning plan based on the user's goal.

Your response must be a valid JSON object with this exact structure:
{
  "title": "Learning Goal Title",
  "summary": "Brief 2-3 sentence overview",
  "steps": [
    {
      "id": "unique-step-id",
      "title": "Step Title",
      "description": "Detailed description",
      "durationMinutes": 60,
      "resources": [
        {
          "type": "article|video|course|book|website|exercise",
          "title": "Resource Title",
          "url": "https://example.com",
          "source": "Source Name"
        }
      ]
    }
  ]
}

Guidelines:
- Create 5-8 progressive steps
- Each step should build on previous ones
- Include diverse resource types
- Provide realistic time estimates
- Include 2-4 resources per step
- Use real, high-quality resource URLs when possible`;

    const userPrompt = `Goal: ${goalTitle}${goalDescription ? `\n\nAdditional Context: ${goalDescription}` : ''}

Please generate a comprehensive learning plan with actionable steps and resources.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in generate-study-plan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
