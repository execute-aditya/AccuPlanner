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

    const { goalId, lessonId, completed } = await req.json();

    // Update lesson completion
    if (lessonId) {
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({ completed })
        .eq('id', lessonId);

      if (lessonError) {
        console.error('Error updating lesson:', lessonError);
        throw lessonError;
      }
    }

    // Calculate and update goal progress
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('completed')
      .eq('goal_id', goalId);

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      throw lessonsError;
    }

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.completed).length;
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const { error: goalError } = await supabase
      .from('learning_goals')
      .update({ progress })
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (goalError) {
      console.error('Error updating goal:', goalError);
      throw goalError;
    }

    return new Response(
      JSON.stringify({ success: true, progress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-goal-progress:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
