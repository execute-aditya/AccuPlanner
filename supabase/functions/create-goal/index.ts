import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, description, category, difficulty, studyPlan } = await req.json();

    // Create the goal
    const { data: goal, error: goalError } = await supabase
      .from('learning_goals')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        difficulty,
        progress: 0,
        hours_spent: 0,
      })
      .select()
      .single();

    if (goalError) {
      console.error('Error creating goal:', goalError);
      throw goalError;
    }

    // If study plan is provided, create lessons
    if (studyPlan && studyPlan.steps) {
      const lessons = studyPlan.steps.map((step: any, index: number) => ({
        goal_id: goal.id,
        title: step.title,
        description: step.description,
        duration_minutes: step.durationMinutes || 60,
        order_index: index,
        completed: false,
        resources: step.resources || [],
      }));

      const { error: lessonsError } = await supabase
        .from('lessons')
        .insert(lessons);

      if (lessonsError) {
        console.error('Error creating lessons:', lessonsError);
        throw lessonsError;
      }
    }

    // Save study plan if provided
    if (studyPlan) {
      await supabase.from('study_plans').insert({
        user_id: user.id,
        goal_title: title,
        plan_data: studyPlan,
      });
    }

    return new Response(
      JSON.stringify({ success: true, goal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-goal:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
