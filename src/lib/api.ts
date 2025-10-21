import { supabase } from '@/integrations/supabase/client';

export interface StudyPlanStep {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  resources: Array<{
    type: 'article' | 'video' | 'course' | 'book' | 'website' | 'exercise';
    title: string;
    url?: string;
    source?: string;
    isPaid?: boolean;
  }>;
}

export interface StudyPlan {
  title: string;
  category?: string;
  difficulty?: number;
  summary: string;
  steps: StudyPlanStep[];
}

export const generateStudyPlan = async (
  goalTitle: string,
  goalDescription: string,
  onChunk: (text: string) => void
): Promise<StudyPlan> => {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`;

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goalTitle, goalDescription }),
  });

  if (!response.ok || !response.body) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please contact support.');
    }
    throw new Error('Failed to generate study plan');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let completeText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          completeText += content;
          onChunk(content);
        }
      } catch (e) {
        // Partial JSON, put it back
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  // Parse the complete JSON response
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = completeText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                     completeText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : completeText;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error('Failed to parse study plan:', e);
    throw new Error('Failed to parse study plan response');
  }
};

export const createGoal = async (
  title: string,
  description: string,
  category: string,
  difficulty: number,
  studyPlan?: StudyPlan
) => {
  const { data, error } = await supabase.functions.invoke('create-goal', {
    body: { title, description, category, difficulty, studyPlan },
  });

  if (error) throw error;
  return data;
};

export const getGoals = async () => {
  const { data, error } = await supabase.functions.invoke('get-goals', {
    body: {},
  });

  if (error) throw error;
  return data.goals;
};

export const getGoal = async (goalId: string) => {
  const { data, error } = await supabase.functions.invoke('get-goals', {
    body: {},
  });

  if (error) throw error;
  return data.goal;
};

export const updateLessonProgress = async (
  goalId: string,
  lessonId: string,
  completed: boolean
) => {
  const { data, error } = await supabase.functions.invoke('update-goal-progress', {
    body: { goalId, lessonId, completed },
  });

  if (error) throw error;
  return data;
};
