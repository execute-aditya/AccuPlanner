import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, Circle, Clock, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { updateLessonProgress } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function LearningPath() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goal, setGoal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select(`*, lessons(*)`)
        .eq('id', goalId)
        .single();

      if (error) throw error;
      setGoal(data);
    } catch (error) {
      console.error('Error loading goal:', error);
      toast({
        title: "Error",
        description: "Failed to load learning path",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLessonToggle = async (lessonId: string, completed: boolean) => {
    try {
      await updateLessonProgress(goalId!, lessonId, completed);
      await loadGoal();
      toast({
        title: completed ? "Lesson completed!" : "Progress updated",
        description: completed ? "Great job! Keep it up!" : "Lesson marked as incomplete",
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Goal not found</h2>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const lessons = goal.lessons || [];
  const completedLessons = lessons.filter((l: any) => l.completed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-indigo-600">{goal.category || 'General'}</Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{goal.title}</h1>
              <p className="text-gray-600 max-w-3xl">{goal.description}</p>
            </div>

            <Card className="w-64">
              <CardHeader className="pb-3">
                <CardDescription>Overall Progress</CardDescription>
                <CardTitle className="text-2xl">{goal.progress}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={goal.progress} className="mb-3" />
                <div className="text-sm text-gray-600">
                  {completedLessons} of {lessons.length} lessons completed
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Path</h2>
        <div className="space-y-4">
          {lessons.map((lesson: any, index: number) => (
            <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {lesson.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                      <CardTitle className="text-xl">
                        Step {index + 1}: {lesson.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="ml-9">{lesson.description}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLessonToggle(lesson.id, !lesson.completed)}
                    variant={lesson.completed ? "outline" : "default"}
                  >
                    {lesson.completed ? 'Mark Incomplete' : 'Mark Complete'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="ml-9">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration_minutes} minutes</span>
                </div>
                {lesson.resources && lesson.resources.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Resources:</h4>
                    <div className="space-y-2">
                      {lesson.resources.map((resource: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 text-sm"
                          >
                            {resource.title}
                          </a>
                          <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
