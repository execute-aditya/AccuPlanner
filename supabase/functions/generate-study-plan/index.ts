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
- Generate a SHORT, concise title (max 6 words) that captures the essence of the learning goal
- Determine the appropriate category based on the goal (e.g., "Programming" for Java, "Language" for Japanese, "AI/ML" for machine learning)
- Assess the difficulty level: 1 for beginners, 2 for intermediate learners, 3 for advanced topics
- Create 5-8 progressive steps that build on each other
- Include 3-5 resources per step
- CRITICAL: Prioritize FREE YouTube videos as primary resources (use type: "video")
- CRITICAL: Only provide VERIFIED YouTube links from popular, reputable channels (e.g., freeCodeCamp, Traversy Media, Fireship, 3Blue1Brown, etc.)
- Prefer well-known educational channels with high view counts to ensure videos are not deleted
- For paid resources (courses, books), set isPaid: true
- Mix free and paid resources, but prioritize free ones first
- Use real, high-quality resource URLs (actual YouTube videos, articles, etc.)
- Provide realistic time estimates
- Resources should have diverse types: video (YouTube), article, course, book, exercise`;

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
