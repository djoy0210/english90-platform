import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetFinalTest, useSubmitFinalTest, getGetFinalTestQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, AlertCircle, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function FinalTestView() {
  const { level } = useParams<{ level: string }>();
  const levelNum = parseInt(level || "1", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: test, isLoading, error } = useGetFinalTest(levelNum, {
    query: { enabled: !!levelNum, queryKey: getGetFinalTestQueryKey(levelNum), retry: false },
  });
  const accessDenied = (error as any)?.status === 403 || (error as any)?.response?.status === 403;

  const submitTest = useSubmitFinalTest();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [passageOpen, setPassageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const passageText: string | undefined = (test?.questions as any[] | undefined)?.find((q: any) => q?.passage)?.passage;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-24 mb-4" />
        <Skeleton className="h-12 w-1/2 mb-8" />
        <Card>
          <CardContent className="p-8 space-y-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-secondary/10 text-secondary-foreground flex items-center justify-center">
          <Trophy className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold">Level {levelNum} шалгалт түгжээтэй</h1>
        <p className="text-muted-foreground">Энэ шалгалтыг өгөхийн тулд Level {levelNum} багц эсвэл бүтэн курс авсан байх шаардлагатай.</p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" onClick={() => setLocation("/billing")}>Багц авах</Button>
          <Button size="lg" variant="outline" onClick={() => setLocation("/lessons")}>Буцах</Button>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12 max-w-4xl mx-auto">
        <p className="text-destructive">Шалгалт олдсонгүй.</p>
        <Button variant="link" onClick={() => setLocation("/lessons")}>Хичээлүүд рүү буцах</Button>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;
  const totalQuestions = test.questions.length;
  const passingScore = (test as any).passingScore ?? 70;

  const handleAttemptSubmit = () => {
    if (answeredCount < totalQuestions) {
      setConfirmOpen(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    setConfirmOpen(false);
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    submitTest.mutate(
      { level: levelNum, data: { answers: formattedAnswers } },
      {
        onSuccess: (result) => {
          setTestResult(result);
          queryClient.invalidateQueries({ queryKey: getGetFinalTestQueryKey(levelNum) });
          queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          
          if (result.passed) {
            toast({
              title: "Баяр хүргэе!",
              description: `Та түвшин ${levelNum} шалгалтыг амжилттай давлаа!`,
            });
          } else {
            toast({
              title: "Дахин оролдоно уу",
              description: `Оноо хүрсэнгүй (${result.percentage}%). Шаардлагатай оноо: ${(test as any).passingScore ?? 70}%`,
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

      {passageText && !testResult && (
        <>
          <Button
            type="button"
            onClick={() => setPassageOpen(true)}
            className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full h-14 px-5 gap-2"
            size="lg"
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">View passage</span>
            <span className="sm:hidden">Passage</span>
          </Button>
          <Dialog open={passageOpen} onOpenChange={setPassageOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary">
                  <BookOpen className="w-5 h-5" />
                  Reading passage · Унших текст
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm leading-7 whitespace-pre-line mt-2">{passageText}</p>
            </DialogContent>
          </Dialog>
        </>
      )}

      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{test.titleMn}</h1>
        <p className="text-xl text-muted-foreground mt-2">{test.titleEn}</p>
        <p className="text-sm mt-4 font-medium text-primary">Нийт {totalQuestions} асуулт • {passingScore}%-иас дээш авч тэнцэнэ</p>
      </div>

      {!testResult && (
        <div className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/85 backdrop-blur-md border-b">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-muted-foreground">Хариулсан · Answered</span>
                <span className="font-bold text-foreground">{answeredCount} / {totalQuestions}</span>
              </div>
              <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
            </div>
            <Button
              size="sm"
              onClick={handleAttemptSubmit}
              disabled={submitTest.isPending}
              className="shrink-0 bg-gradient-to-r from-primary to-primary/85"
            >
              {submitTest.isPending ? "..." : "Илгээх"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Бүх асуултанд хариулаагүй байна
            </DialogTitle>
            <DialogDescription>
              Та {totalQuestions - answeredCount} асуултыг хоосон үлдээж байна. Хоосон үлдээсэн асуултууд буруу гэж тооцогдоно.
              <br /><br />
              Үргэлжлүүлэн илгээх үү?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Үгүй, буцах</Button>
            <Button onClick={doSubmit} disabled={submitTest.isPending}>Тийм, илгээх</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {testResult ? (
        <Card className={`border-2 overflow-hidden ${testResult.passed ? 'border-emerald-500/40' : 'border-amber-500/40'}`}>
          <div className={`h-2 ${testResult.passed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />
          <CardHeader className="text-center pb-2">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg ${
              testResult.passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
            }`}>
              {testResult.passed ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            </div>
            <CardTitle className="text-3xl flex items-center justify-center gap-2">
              {testResult.passed && <Sparkles className="w-7 h-7 text-amber-500" />}
              {testResult.passed ? 'Амжилттай тэнцлээ!' : 'Харамсалтай нь тэнцсэнгүй'}
            </CardTitle>
            <CardDescription className="text-xl mt-2">
              Таны оноо: <span className="font-bold text-foreground text-2xl">{testResult.percentage}%</span>
              <span className="text-sm ml-2 text-muted-foreground">({testResult.score}/{testResult.total} зөв)</span>
            </CardDescription>
            <div className="max-w-sm mx-auto mt-4">
              <div className="h-3 rounded-full bg-muted overflow-hidden relative">
                <div
                  className={`h-full transition-all ${testResult.passed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                  style={{ width: `${testResult.percentage}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-foreground/40"
                  style={{ left: `${passingScore}%` }}
                  title={`Pass: ${passingScore}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>Pass: {passingScore}%</span>
                <span>100%</span>
              </div>
            </div>
            {testResult.passed && levelNum < 3 && (
              <div className="mt-4 inline-flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                <Sparkles className="w-4 h-4" /> Level {levelNum + 1} нээгдэх боломжтой
              </div>
            )}
            {testResult.passed && levelNum === 3 && (
              <div className="mt-4 inline-flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                <Trophy className="w-4 h-4" /> 90 хоногийн аялалаа дуусгалаа!
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">Дэлгэрэнгүй:</h3>
              {testResult.correctAnswers.map((ans: any, idx: number) => {
                const question = test.questions.find(q => q.id === ans.questionId);
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
              
              <div className="flex justify-center gap-4 pt-6">
                <Button variant="outline" size="lg" onClick={() => {
                  setTestResult(null);
                  setAnswers({});
                }}>
                  Дахин өгөх
                </Button>
                <Button size="lg" onClick={() => setLocation("/lessons")}>
                  Хичээлүүд рүү буцах
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(() => {
            const sections: { title: string; intro?: string; count: number; anchorId: string; firstQ: number }[] = [];
            (test.questions as any[]).forEach((q, qIdx) => {
              if (q.sectionTitle) {
                sections.push({ title: q.sectionTitle, intro: q.sectionIntro, count: 1, anchorId: `section-${sections.length + 1}`, firstQ: qIdx + 1 });
              } else if (sections.length > 0) {
                sections[sections.length - 1].count++;
              }
            });
            if (sections.length === 0) return null;
            const jumpTo = (id: string) => {
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            };
            return (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                    Шалгалтын бүтэц · Test outline · <span className="normal-case font-normal text-muted-foreground">tap a section to jump</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {sections.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => jumpTo(s.anchorId)}
                        className="text-left flex items-start gap-3 rounded-lg bg-background border p-3 hover:border-primary hover:shadow-sm transition cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight">{s.title}</p>
                          {s.intro && <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{s.intro}</p>}
                          <p className="text-xs text-primary mt-1 font-medium">{s.count} асуулт · jump ↓</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-10">
                {test.questions.map((question: any, idx: number) => {
                  const isFill = question.type === "fill" || (Array.isArray(question.options) && question.options.length === 0);
                  let sectionAnchor: string | undefined;
                  if (question.sectionTitle) {
                    const sectionIdx = (test.questions as any[])
                      .slice(0, idx + 1)
                      .filter((q: any) => q.sectionTitle).length;
                    sectionAnchor = `section-${sectionIdx}`;
                  }
                  return (
                    <div key={question.id} className="space-y-5" id={sectionAnchor}>
                      {question.sectionTitle && (
                        <div className="border-l-4 border-primary bg-muted/40 px-4 py-3 rounded-r-md scroll-mt-4">
                          <h2 className="font-semibold text-base">{question.sectionTitle}</h2>
                          {question.sectionIntro && (
                            <p className="text-sm text-muted-foreground mt-1">{question.sectionIntro}</p>
                          )}
                        </div>
                      )}
                      {question.audioUrl && question.sectionTitle && (
                        <div className="sticky top-2 z-10 rounded-lg border-2 border-primary bg-card shadow-md">
                          <div className="px-5 py-3 bg-primary/10 rounded-t-lg flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">🎧 Listening audio · Дууг сонсоорой</span>
                          </div>
                          <div className="px-5 py-4">
                            <audio controls preload="metadata" src={question.audioUrl} className="w-full">
                              Your browser does not support audio playback.
                            </audio>
                            <p className="text-xs text-muted-foreground mt-2">
                              Та шаардлагатай гэж үзвэл олон удаа дахин сонсож болно. / You may replay as many times as you need.
                            </p>
                          </div>
                        </div>
                      )}
                      {question.passage && (
                        <details
                          open
                          className="sticky top-2 z-10 rounded-lg border-2 border-primary bg-card shadow-md group"
                        >
                          <summary className="cursor-pointer list-none px-5 py-3 flex items-center justify-between bg-primary/10 rounded-t-lg">
                            <span className="text-sm font-semibold text-primary">
                              📖 Reading passage · Текстийг уншаарай
                            </span>
                            <span className="text-xs text-muted-foreground group-open:hidden">Дэлгэх ▾</span>
                            <span className="text-xs text-muted-foreground hidden group-open:inline">Хураах ▴</span>
                          </summary>
                          <div className="px-5 py-4 max-h-72 overflow-y-auto">
                            <p className="text-sm leading-7 whitespace-pre-line">{question.passage}</p>
                          </div>
                        </details>
                      )}
                      <div>
                        <h3 className="text-lg font-medium leading-relaxed">
                          <span className="text-primary mr-2 font-bold">{idx + 1}.</span>
                          {question.promptEn}
                        </h3>
                      </div>
                      {isFill ? (
                        <div className="ml-6">
                          <input
                            type="text"
                            value={answers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Хариултаа бичээрэй..."
                            className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <RadioGroup
                          value={answers[question.id] || ""}
                          onValueChange={(val) => handleAnswerChange(question.id, val)}
                          className="ml-6 space-y-4"
                        >
                          {question.options.map((option: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center space-x-3">
                              <RadioGroupItem value={option} id={`${question.id}-opt-${optIdx}`} className="h-5 w-5" />
                              <Label htmlFor={`${question.id}-opt-${optIdx}`} className="text-base font-normal cursor-pointer leading-tight">
                                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleAttemptSubmit}
              disabled={submitTest.isPending}
              className="px-12 h-14 text-lg w-full max-w-md"
            >
              {submitTest.isPending ? "Илгээж байна..." : "Шалгалт илгээх"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}