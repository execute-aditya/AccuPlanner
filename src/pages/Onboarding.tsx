import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { generateStudyPlan, createGoal, getGoals } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type ProgressStage = 'idle' | 'analyzing' | 'searching' | 'building' | 'validating' | 'complete';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStage, setProgressStage] = useState<ProgressStage>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [hasExistingGoals, setHasExistingGoals] = useState(false);
  const [isCheckingGoals, setIsCheckingGoals] = useState(true);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const progressStages: Record<ProgressStage, { label: string; percent: number }> = {
    idle: { label: '', percent: 0 },
    analyzing: { label: 'Analyzing your goal...', percent: 20 },
    searching: { label: 'Finding the best resources...', percent: 50 },
    building: { label: 'Building your learning path...', percent: 75 },
    validating: { label: 'Validating resources...', percent: 90 },
    complete: { label: 'Complete!', percent: 100 },
  };

  // Check if user has existing goals
  useEffect(() => {
    const checkExistingGoals = async () => {
      try {
        const goals = await getGoals();
        setHasExistingGoals(goals && goals.length > 0);
      } catch (error) {
        console.error('Error checking goals:', error);
      } finally {
        setIsCheckingGoals(false);
      }
    };

    checkExistingGoals();
  }, []);

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
    setProgressStage('analyzing');
    setProgressPercent(20);
    
    try {
      // Simulate progress stages
      const stageTimers: NodeJS.Timeout[] = [];
      
      stageTimers.push(setTimeout(() => {
        setProgressStage('searching');
        setProgressPercent(50);
      }, 1500));
      
      stageTimers.push(setTimeout(() => {
        setProgressStage('building');
        setProgressPercent(75);
      }, 3000));
      
      const studyPlan = await generateStudyPlan(goalTitle, goalDescription, () => {});
      
      // Clear timers once we have the plan
      stageTimers.forEach(t => clearTimeout(t));
      
      setProgressStage('validating');
      setProgressPercent(90);

      // Use AI-generated title, category, and difficulty from the study plan
      const title = studyPlan.title || goalTitle;
      const category = studyPlan.category || 'General';
      const difficulty = studyPlan.difficulty || 1;

      await createGoal(title, goalDescription, category, difficulty, studyPlan);
      
      setProgressStage('complete');
      setProgressPercent(100);
      
      setTimeout(() => {
        toast({
          title: "Success!",
          description: "Your learning goal has been created",
        });
        navigate('/');
      }, 500);
      
    } catch (error) {
      console.error('Error creating goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to create goal');
      setProgressStage('idle');
      setProgressPercent(0);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
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
            {isCheckingGoals ? (
              'Loading...'
            ) : hasExistingGoals ? (
              `Welcome back, ${userName}!`
            ) : (
              `Welcome to AccuPlanner, ${userName}!`
            )}
          </h1>
          <p className="text-gray-600">
            {isCheckingGoals ? (
              'Checking your goals...'
            ) : hasExistingGoals ? (
              'Create another learning goal to expand your knowledge'
            ) : (
              "Let's create your first learning goal to get started"
            )}
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

            {isLoading && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
                  <span className="font-medium text-indigo-900">
                    {progressStages[progressStage].label}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{progressPercent}% Complete</span>
                    {progressStage === 'complete' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${progressPercent >= 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={progressPercent >= 20 ? 'text-gray-700' : 'text-gray-400'}>
                      Analyzing your goal
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${progressPercent >= 50 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={progressPercent >= 50 ? 'text-gray-700' : 'text-gray-400'}>
                      Finding resources
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${progressPercent >= 75 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={progressPercent >= 75 ? 'text-gray-700' : 'text-gray-400'}>
                      Building learning path
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${progressPercent >= 90 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={progressPercent >= 90 ? 'text-gray-700' : 'text-gray-400'}>
                      Validating resources
                    </span>
                  </div>
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
