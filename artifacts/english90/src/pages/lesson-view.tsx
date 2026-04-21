import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetLesson, useSubmitLessonQuiz, getGetLessonQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, CheckCircle2, AlertCircle, PlayCircle, Lock, Volume2, Clock, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "../components/AudioPlayer";

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
          Энэхүү хичээлийг үзэхийн тулд Level {lesson.level} багц эсвэл бүтэн курс авсан байх ёстой.
        </p>
        <div className="rounded-xl border bg-muted/30 p-6 max-w-md mx-auto text-left space-y-2 text-sm">
          <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 30 хоногийн бүх хичээл нээгдэнэ</p>
          <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Level {lesson.level} төгсгөлийн шалгалт нээгдэнэ</p>
          <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Audio listening + бүх дасгал</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button size="lg" onClick={() => setLocation("/billing")}>
            Level {lesson.level} багц авах · 29,000₮
          </Button>
          <Button size="lg" variant="outline" onClick={() => setLocation("/lessons")}>Буцах</Button>
        </div>
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

  const speakWord = (word: string) => {
    if (!("speechSynthesis" in window)) {
      toast({
        title: "Дуу тоглуулах боломжгүй",
        description: "Таны browser pronunciation дэмжихгүй байна.",
        variant: "destructive",
      });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const lessonContent = (lesson as any).lessonContent || {};
  const page1 = lessonContent.page1 || {};
  const page2 = lessonContent.page2 || {};
  const page3 = lessonContent.page3 || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-2 -ml-4" onClick={() => setLocation("/lessons")}>
        <ArrowLeft className="mr-2 w-4 h-4" /> Хичээлүүд
      </Button>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border">
            Өдөр {lesson.day} • Түвшин {lesson.level} • {lesson.durationMinutes} минут
          </span>
          {lesson.completed && (
            <span className="flex items-center text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Дууссан
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{lesson.titleMn}</h1>
        <p className="text-xl text-muted-foreground mt-1">{lesson.titleEn}</p>
        {(lesson as any).pdfUrl && (
          <a href={(lesson as any).pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline mt-2 inline-block">
            Original PDF / эх PDF харах
          </a>
        )}
      </div>

      <Tabs defaultValue="page1" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="page1">Page 1</TabsTrigger>
          <TabsTrigger value="page2">Page 2</TabsTrigger>
          <TabsTrigger value="page3">Page 3</TabsTrigger>
          <TabsTrigger value="quiz">Сорил</TabsTrigger>
        </TabsList>

        <TabsContent value="page1" className="space-y-6 mt-6">
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
              <div className="grid gap-3 sm:grid-cols-3 pt-3">
                <div className="rounded-lg border bg-background p-4">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold">{lesson.durationMinutes} минут</p>
                  <p className="text-sm text-muted-foreground">Өдөр бүрийн хичээл</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <Volume2 className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold">20 шинэ үг</p>
                  <p className="text-sm text-muted-foreground">Дарж дуудлага сонсоно</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <ClipboardList className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold">Гэрийн даалгавар</p>
                  <p className="text-sm text-muted-foreground">Өдөр бүр давтлага хийнэ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" /> Vocabulary — 20 New Words
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">English</th>
                    <th className="p-3">Pronunciation</th>
                    <th className="p-3">Монгол</th>
                    <th className="p-3">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {lesson.vocabulary.map((vocab, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => speakWord(vocab.english)} className="font-bold text-primary hover:underline inline-flex items-center gap-2">
                          {vocab.english}<Volume2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="p-3 text-muted-foreground">{(vocab as any).pronunciation || ""}</td>
                      <td className="p-3">{vocab.mongolian}</td>
                      <td className="p-3 italic">{vocab.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>{page1.grammarTopic || "Grammar"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="leading-7 whitespace-pre-line">{page1.grammarExplanation || lesson.contentEn}</p>
              {Array.isArray(page1.grammarTable) && page1.grammarTable.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody>
                      {page1.grammarTable.map((row: any, idx: number) => (
                        <tr key={idx} className="border-t first:border-t-0">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="p-3 align-top">
                              <span className="block text-xs uppercase text-muted-foreground">{key}</span>
                              <span className="font-medium">{String(value)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Quick Practice</h3>
                  <ul className="space-y-2 text-sm list-disc pl-5">{(page1.quickPractice || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Common Mistakes</h3>
                  <ul className="space-y-2 text-sm list-disc pl-5">{(page1.commonMistakes || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="rounded-lg border p-4 bg-primary/5">
                  <h3 className="font-semibold mb-3">Answer Key</h3>
                  <ul className="space-y-2 text-sm list-disc pl-5">{(page1.answerKey || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page2" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reading & Speaking · Унших ба Ярих</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="rounded-xl bg-muted/40 p-5 leading-8 whitespace-pre-line">{page2.readingPassage || lesson.contentEn}</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Key Phrases</h3>
                  <div className="space-y-3">{(page2.keyPhrases || []).map((phrase: any, idx: number) => <div key={idx} className="border-b pb-2 last:border-0"><p className="font-medium">{phrase.english}</p><p className="text-sm text-muted-foreground">{phrase.mongolian}</p><p className="text-xs text-primary">{phrase.note}</p></div>)}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Speaking Questions</h3>
                  <ol className="space-y-2 list-decimal pl-5">{(page2.speakingQuestions || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ol>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Role Play</h3>
                <div className="grid gap-3 md:grid-cols-2">{(page2.rolePlay || []).map((line: any, idx: number) => <div key={idx} className="rounded-lg bg-background p-3 border"><span className="font-bold text-primary">{line.speaker}: </span>{line.text}</div>)}</div>
              </div>
              <div className="rounded-lg bg-secondary/10 p-4 text-sm font-medium">{page2.speakingTip}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page3" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Listening · Practice · Homework</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><PlayCircle className="w-4 h-4 text-primary" /> Listening Script</h3>
                <div className="rounded-xl bg-muted/40 p-5 leading-8 whitespace-pre-line">{page3.listeningScript}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {page3.listeningScript && (
                    <Button type="button" size="sm" variant="outline" onClick={() => speakWord(page3.listeningScript)}>
                      <Volume2 className="w-4 h-4 mr-2" /> Уншуулах (TTS)
                    </Button>
                  )}
                </div>
                {(lesson as any).audioUrl && (
                  <AudioPlayer
                    src={
                      /^https?:\/\//.test((lesson as any).audioUrl)
                        ? (lesson as any).audioUrl
                        : `${import.meta.env.BASE_URL}${(lesson as any).audioUrl.replace(/^\/+/, "")}`
                    }
                    title="Жинхэнэ дуу хичээл · Real recorded listening"
                  />
                )}
              </div>
              {Array.isArray(page3.listeningQuestions) && page3.listeningQuestions.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Listening Questions</h3>
                  <ol className="space-y-2 list-decimal pl-5 text-sm">
                    {page3.listeningQuestions.map((q: any, idx: number) => (
                      <li key={idx}>
                        <p>{typeof q === "string" ? q : q.question || q.prompt}</p>
                        {typeof q !== "string" && q.answer && <p className="text-muted-foreground italic">→ {q.answer}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Grammar Practice</h3>
                  <ol className="space-y-2 list-decimal pl-5">{(page3.grammarPractice || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ol>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Matching Exercise</h3>
                  <div className="space-y-2">{(page3.matchingExercise || []).map((item: any, idx: number) => <div key={idx} className="flex justify-between gap-4 text-sm"><span>{item.left}</span><span className="font-medium">{item.right}</span></div>)}</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Homework</h3>
                  <ul className="space-y-2 list-disc pl-5 text-sm">{(page3.homework || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="rounded-lg border p-4 bg-primary/5">
                  <h3 className="font-semibold mb-3">Answer Key</h3>
                  <ul className="space-y-2 list-disc pl-5 text-sm">{(page3.answerKey || []).map((item: string, idx: number) => <li key={idx}>{item}</li>)}</ul>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-3">Lesson Complete</h3>
                  <ul className="space-y-2 text-sm">{(page3.completionSummary || []).map((item: string, idx: number) => <li key={idx} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" />{item}</li>)}</ul>
                  <p className="text-sm text-primary mt-4 font-semibold">{page3.nextLessonPreview}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                        Хичээлийн жагсаалт
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