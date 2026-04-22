import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetFinalTest, useSelfReportFinalTest, getGetFinalTestQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sparkles, BookOpen } from "lucide-react";
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

  const selfReport = useSelfReportFinalTest();

  const [scoreInput, setScoreInput] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);

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

  const passingScore = (test as any).passingScore ?? 70;
  const TOTAL = 50;

  const handleSelfReport = () => {
    const score = parseInt(scoreInput, 10);
    if (isNaN(score) || score < 0 || score > TOTAL) {
      toast({
        title: "Буруу оноо",
        description: `Оноо 0-ээс ${TOTAL}-н хооронд байх ёстой.`,
        variant: "destructive",
      });
      return;
    }
    selfReport.mutate(
      { level: levelNum, data: { score, total: TOTAL } },
      {
        onSuccess: (result) => {
          setTestResult(result);
          queryClient.invalidateQueries({ queryKey: getGetFinalTestQueryKey(levelNum) });
          queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          if (result.passed) {
            toast({ title: "Баяр хүргэе!", description: `Та Level ${levelNum} шалгалтыг амжилттай давлаа!` });
          } else {
            toast({
              title: "Дахин оролдоно уу",
              description: `Оноо хүрсэнгүй (${result.percentage}%). Шаардлагатай: ${passingScore}%`,
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({ title: "Алдаа гарлаа", description: "Дахин оролдоно уу.", variant: "destructive" });
        },
      }
    );
  };

  const officialTestUrl = `${import.meta.env.BASE_URL}final-tests/level-${levelNum}.html`;
  const levelLabel = levelNum === 1 ? "A1" : levelNum === 2 ? "A2" : "B1";
  const levelMinutes = levelNum === 1 ? 45 : levelNum === 2 ? 50 : 55;
  const levelGradient = levelNum === 1
    ? "from-blue-500 to-indigo-600"
    : levelNum === 2
      ? "from-emerald-500 to-teal-600"
      : "from-violet-600 to-purple-700";

  return (
    <>
    {!testResult && (
      <Card className="max-w-4xl mx-auto mb-6 overflow-hidden border-2 border-primary/30 shadow-lg">
        <div className={`h-2 bg-gradient-to-r ${levelGradient}`} />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" /> Official final test · Албан ёсны эцсийн шалгалт
          </div>
          <CardTitle className="text-2xl mt-1">{levelLabel} Final Test — 50 questions</CardTitle>
          <CardDescription className="text-base">
            50 асуулт · {levelMinutes} минут · Pass 35/50 (70%) · Distinction 45/50 (90%)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Албан ёсны бүрэн эцсийн шалгалтыг шинэ хуудсанд нээж өгнө үү. Цаг хугацаа автоматаар тоологдоно.
          </p>
          <Button asChild size="lg" className={`bg-gradient-to-r ${levelGradient} text-white hover:opacity-95 shrink-0`}>
            <a href={officialTestUrl} target="_blank" rel="noopener noreferrer">
              Шалгалтыг нээх →
            </a>
          </Button>
        </CardContent>
      </Card>
    )}

    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-2 -ml-4" onClick={() => setLocation('/lessons')}>
        <ArrowLeft className="mr-2 w-4 h-4" /> Хичээлүүд
      </Button>

      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{test.titleMn}</h1>
        <p className="text-lg text-muted-foreground mt-1">{test.titleEn}</p>
        <p className="text-sm mt-3 font-medium text-primary">{passingScore}%-иас дээш авч тэнцэнэ</p>
      </div>

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
              <span className="text-sm ml-2 text-muted-foreground">({testResult.score}/{testResult.total})</span>
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
          <CardContent className="pt-2">
            <div className="flex justify-center gap-3 pt-4 flex-wrap">
              <Button variant="outline" size="lg" onClick={() => { setTestResult(null); setScoreInput(''); }}>
                Дахин өгөх
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={officialTestUrl} target="_blank" rel="noopener noreferrer">Шалгалтыг дахин нээх</a>
              </Button>
              <Button size="lg" onClick={() => setLocation('/lessons')}>Хичээлүүд рүү буцах</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Шалгалтын оноогоо илгээх · Submit your score</CardTitle>
            <CardDescription className="text-base leading-relaxed mt-2">
              Албан ёсны шалгалтыг өгсөний дараа гарсан оноогоо доор оруулна уу. Систем таны оноог хадгалж, тэнцсэн эсэхийг шалгана.
              <br />
              <span className="text-xs italic text-muted-foreground">After completing the official test above, enter the final score it showed you (out of 50).</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1.5">
              <p><span className="font-semibold">Pass:</span> 35 / 50 (70%) — Level {levelNum} тэнцсэн</p>
              <p><span className="font-semibold">Distinction:</span> 45 / 50 (90%) — Outstanding!</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <Label htmlFor="score-input" className="text-sm font-semibold mb-1.5 block">
                  Таны оноо · Your score (0–50)
                </Label>
                <input
                  id="score-input"
                  type="number"
                  min={0}
                  max={50}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder="e.g. 38"
                  className="w-full h-12 rounded-md border border-input bg-background px-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button
                size="lg"
                onClick={handleSelfReport}
                disabled={selfReport.isPending || !scoreInput}
                className="h-12 px-8 shrink-0"
              >
                {selfReport.isPending ? 'Илгээж байна...' : 'Илгээх · Submit'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Шударгаар оруулна уу. Багш админ оноог шалгах боломжтой.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
