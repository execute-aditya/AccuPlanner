import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle2, Circle, Clock, BookOpen, Loader2, ExternalLink, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { updateLessonProgress } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function LearningPath() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goal, setGoal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

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

  const lessons = goal.lessons ? [...goal.lessons].sort((a: any, b: any) => a.order_index - b.order_index) : [];
  const completedLessons = lessons.filter((l: any) => l.completed).length;

  const freeResources = selectedLesson?.resources?.filter((r: any) => !r.isPaid) || [];
  const paidResources = selectedLesson?.resources?.filter((r: any) => r.isPaid) || [];

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
          {lessons.map((lesson: any) => (
            <Card 
              key={lesson.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedLesson(lesson)}
            >
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
                        Step {lesson.order_index + 1}: {lesson.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="ml-9">{lesson.description}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLessonToggle(lesson.id, !lesson.completed);
                    }}
                    variant={lesson.completed ? "outline" : "default"}
                  >
                    {lesson.completed ? 'Mark Incomplete' : 'Mark Complete'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="ml-9">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.duration_minutes} minutes</span>
                  </div>
                  {lesson.resources && lesson.resources.length > 0 && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{lesson.resources.length} resources</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedLesson} onOpenChange={(open) => !open && setSelectedLesson(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedLesson?.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
              Step {selectedLesson?.order_index + 1}: {selectedLesson?.title}
            </DialogTitle>
            <DialogDescription className="text-base mt-4">
              {selectedLesson?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-b py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{selectedLesson?.duration_minutes} minutes</span>
              </div>
            </div>

            {freeResources.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Free Resources</h3>
                <div className="space-y-3">
                  {freeResources.map((resource: any, idx: number) => (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                    >
                      <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-indigo-700 mb-1">
                          {resource.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          {resource.source && (
                            <span className="text-xs text-gray-500">{resource.source}</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {paidResources.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Paid Resources
                </h3>
                <div className="space-y-3">
                  {paidResources.map((resource: any, idx: number) => (
                    <a
                      key={idx}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100 transition-colors group"
                    >
                      <BookOpen className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 group-hover:text-amber-700 mb-1">
                          {resource.title}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-white">
                            {resource.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300">
                            Paid
                          </Badge>
                          {resource.source && (
                            <span className="text-xs text-gray-600">{resource.source}</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-amber-600 group-hover:text-amber-700 flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  handleLessonToggle(selectedLesson.id, !selectedLesson.completed);
                  setSelectedLesson(null);
                }}
                className="flex-1"
                variant={selectedLesson?.completed ? "outline" : "default"}
              >
                {selectedLesson?.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </Button>
              <Button onClick={() => setSelectedLesson(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
