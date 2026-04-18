import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetLesson, useSubmitLessonQuiz, getGetLessonQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, CheckCircle2, AlertCircle, PlayCircle, Star, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lesson, isLoading } = useGetLesson(lessonId!, {
    query: { enabled: !!lessonId, queryKey: getGetLessonQueryKey(lessonId!) },
  });

  const submitQuiz = useSubmitLessonQuiz();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="h-12 w-3/4 mb-8" />
        <Card>
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Хичээл олдсонгүй.</p>
        <Button variant="link" onClick={() => setLocation("/lessons")}>Хичээлүүд рүү буцах</Button>
      </div>
    );
  }

  if (lesson.isPremium && !lesson.isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-secondary/10 text-secondary-foreground rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold">Premium хичээл</h1>
        <p className="text-muted-foreground text-lg">
          Энэхүү хичээлийг үзэхийн тулд Premium эрхтэй байх шаардлагатай.
        </p>
        <Button size="lg" onClick={() => setLocation("/billing")}>
          Premium идэвхжүүлэх
        </Button>
        <Button variant="ghost" onClick={() => setLocation("/lessons")} className="block mx-auto mt-4">
          Буцах
        </Button>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitQuiz = () => {
    if (Object.keys(answers).length < lesson.quiz.length) {
      toast({
        title: "Анхааруулга",
        description: "Бүх асуултад хариулна уу.",
        variant: "destructive",
      });
      return;
    }

    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    submitQuiz.mutate(
      { lessonId: lesson.id, data: { answers: formattedAnswers } },
      {
        onSuccess: (result) => {
          setQuizResult(result);
          queryClient.invalidateQueries({ queryKey: getGetLessonQueryKey(lesson.id) });
          // Invalidate list lessons to update the complete status
          queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          
          if (result.passed) {
            toast({
              title: "Баяр хүргэе!",
              description: `Та шалгалтыг амжилттай давлаа. (${result.percentage}%)`,
            });
          } else {
            toast({
              title: "Дахин оролдоно уу",
              description: `Оноо хүрсэнгүй (${result.percentage}%). Шаардлагатай оноо: 80%`,
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "Алдаа гарлаа",
            description: "Шалгалт илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-2 -ml-4" onClick={() => setLocation("/lessons")}>
        <ArrowLeft className="mr-2 w-4 h-4" /> Хичээлүүд
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border">
            Өдөр {lesson.day} • Түвшин {lesson.level}
          </span>
          {lesson.completed && (
            <span className="flex items-center text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Дууссан
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{lesson.titleMn}</h1>
        <p className="text-xl text-muted-foreground mt-1">{lesson.titleEn}</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Хичээл</TabsTrigger>
          <TabsTrigger value="vocab">Шинэ үгс ({lesson.vocabulary.length})</TabsTrigger>
          <TabsTrigger value="quiz">Сорил</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Зорилго
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="font-medium text-foreground">{lesson.objectiveMn}</p>
                <p className="text-muted-foreground mt-1">{lesson.objectiveEn}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Агуулга
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: lesson.contentMn.replace(/\n/g, '<br/>') }} />
                <hr className="my-6 border-dashed" />
                <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: lesson.contentEn.replace(/\n/g, '<br/>') }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocab" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.vocabulary.map((vocab, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="h-2 bg-primary/20 w-full" />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl text-primary">{vocab.english}</h3>
                  </div>
                  <p className="font-medium mb-4">{vocab.mongolian}</p>
                  <div className="bg-muted p-3 rounded-md text-sm border border-border/50">
                    <span className="text-muted-foreground font-medium mb-1 block">Жишээ:</span>
                    <p className="italic text-foreground">"{vocab.example}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          {quizResult ? (
            <Card className={`border-2 ${quizResult.passed ? 'border-primary' : 'border-destructive'}`}>
              <CardHeader className="text-center pb-2">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
                  quizResult.passed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                }`}>
                  {quizResult.passed ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>
                <CardTitle className="text-2xl">
                  {quizResult.passed ? 'Амжилттай!' : 'Харамсалтай нь тэнцсэнгүй'}
                </CardTitle>
                <CardDescription className="text-lg">
                  Таны оноо: <span className="font-bold text-foreground">{quizResult.percentage}%</span> ({quizResult.score}/{quizResult.total})
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg border-b pb-2">Дэлгэрэнгүй:</h3>
                  {quizResult.correctAnswers.map((ans: any, idx: number) => {
                    const question = lesson.quiz.find(q => q.id === ans.questionId);
                    return (
                      <div key={ans.questionId} className={`p-4 rounded-lg border ${ans.isCorrect ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
                        <p className="font-medium mb-1">{idx + 1}. {question?.promptMn}</p>
                        <p className="text-sm text-muted-foreground mb-3">{question?.promptEn}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-medium">Таны хариулт:</span>
                          <span className={`text-sm ${ans.isCorrect ? 'text-primary font-bold' : 'text-destructive line-through'}`}>
                            {answers[ans.questionId]}
                          </span>
                        </div>
                        
                        {!ans.isCorrect && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium">Зөв хариулт:</span>
                            <span className="text-sm text-primary font-bold">{ans.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-center gap-4 pt-4">
                    <Button variant="outline" onClick={() => {
                      setQuizResult(null);
                      setAnswers({});
                    }}>
                      Дахин өгөх
                    </Button>
                    {quizResult.passed && (
                      <Button onClick={() => setLocation("/lessons")}>
                        Дараагийн хичээл
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-lg">Мэдлэг шалгах сорил</CardTitle>
                  <CardDescription>
                    Асуулт бүрт зөв хариултыг сонгоно уу. Дараагийн хичээлд орохын тулд 80%-иас дээш оноо авах шаардлагатай.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-10">
                    {lesson.quiz.map((question, idx) => (
                      <div key={question.id} className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">
                            <span className="text-primary mr-2">{idx + 1}.</span> 
                            {question.promptMn}
                          </h3>
                          <p className="text-muted-foreground ml-6 mt-1">{question.promptEn}</p>
                        </div>
                        <RadioGroup 
                          value={answers[question.id] || ""} 
                          onValueChange={(val) => handleAnswerChange(question.id, val)}
                          className="ml-6 space-y-3"
                        >
                          {question.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-3">
                              <RadioGroupItem value={option} id={`${question.id}-opt-${optIdx}`} />
                              <Label htmlFor={`${question.id}-opt-${optIdx}`} className="text-base font-normal cursor-pointer leading-tight">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  size="lg" 
                  onClick={handleSubmitQuiz}
                  disabled={submitQuiz.isPending}
                  className="px-10 h-14 text-base"
                >
                  {submitQuiz.isPending ? "Илгээж байна..." : "Шалгалт илгээх"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}