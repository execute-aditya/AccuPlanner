import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateStudyPlan, createGoal } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState('');

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!goalTitle.trim()) {
      setError('Please enter a goal title');
      return;
    }

    if (goalTitle.length < 3) {
      setError('Goal title must be at least 3 characters');
      return;
    }

    setIsLoading(true);
    setStreamedText('');
    
    try {
      const studyPlan = await generateStudyPlan(goalTitle, goalDescription, (chunk) => {
        setStreamedText(prev => prev + chunk);
      });

      // Use AI-generated title, category, and difficulty from the study plan
      const title = studyPlan.title || goalTitle;
      const category = studyPlan.category || 'General';
      const difficulty = studyPlan.difficulty || 1;

      await createGoal(title, goalDescription, category, difficulty, studyPlan);
      
      toast({
        title: "Success!",
        description: "Your learning goal has been created",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error creating goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Target className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to AccuPlanner, {userName}!
          </h1>
          <p className="text-gray-600">
            Let's create your first learning goal to get started
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="goalTitle" className="text-gray-700 font-medium text-base">
                What do you want to learn?
              </Label>
              <Input
                id="goalTitle"
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g., Learn React, Master Python, Understand Machine Learning"
                disabled={isLoading}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="goalDescription" className="text-gray-700 font-medium text-base">
                Tell us more about your goal (optional)
              </Label>
              <Textarea
                id="goalDescription"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Add any additional context, your current level, or specific topics you want to focus on..."
                disabled={isLoading}
                rows={4}
                className="mt-2"
              />
            </div>

            {isLoading && streamedText && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <span className="text-sm font-medium text-indigo-900">AI is generating your learning plan...</span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {streamedText}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Your Learning Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI-Powered Learning Plan
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
