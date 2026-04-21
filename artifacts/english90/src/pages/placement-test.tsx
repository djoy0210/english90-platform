import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetPlacementTest, useSubmitPlacementTest, getGetMeQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlacementTest() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: test, isLoading } = useGetPlacementTest();
  const submitPlacementTest = useSubmitPlacementTest();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!test) {
    return <p className="text-destructive">Түвшин тогтоох тест олдсонгүй.</p>;
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < test.questions.length) {
      toast({
        title: "Бүх асуултад хариулна уу",
        description: "Түвшинг зөв тогтоохын тулд бүх асуултыг бөглөөрэй.",
        variant: "destructive",
      });
      return;
    }

    submitPlacementTest.mutate(
      { data: { answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) } },
      {
        onSuccess: (data) => {
          setResult(data);
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: () => {
          toast({
            title: "Алдаа гарлаа",
            description: "Тест илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <CardTitle className="text-3xl">Таны түвшин: Level {result.level}</CardTitle>
            <CardDescription className="text-lg pt-2">
              {result.messageMn}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="rounded-xl bg-muted p-5">
              <p className="font-semibold text-foreground">Зөвлөмж: Level {result.level}</p>
              <p className="text-muted-foreground">Өдөр {result.startingDay}-аас эхлээрэй</p>
              <p className="text-sm text-muted-foreground mt-2">Оноо: {result.score}/{result.total} ({result.percentage}%)</p>
            </div>
            <Button size="lg" onClick={() => setLocation("/dashboard")} className="w-full sm:w-auto">
              Хянах самбар руу очих
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-2 text-primary">
          <Target className="h-6 w-6" />
          <span className="font-semibold">Эхлэхийн өмнө</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{test.titleMn}</h1>
        <p className="text-muted-foreground mt-2">
          Эдгээр асуултанд хариулсны эцэст бид таны түвшин болон эхлэх өдрийг санал болгоно. Үнэгүй.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{test.titleEn}</CardTitle>
          <CardDescription>Асуулт бүрт хамгийн зөв хариултыг сонгоно уу.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {test.questions.map((question, index) => (
            <div key={question.id} className="space-y-4 border-b last:border-0 pb-6 last:pb-0">
              <div>
                <h3 className="font-semibold">
                  {index + 1}. {question.promptMn}
                </h3>
                <p className="text-sm text-muted-foreground">{question.promptEn}</p>
              </div>
              <RadioGroup value={answers[question.id] || ""} onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                    <Label htmlFor={`${question.id}-${optionIndex}`} className="cursor-pointer font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={submitPlacementTest.isPending}>
          {submitPlacementTest.isPending ? "Илгээж байна..." : "Түвшин тогтоох"}
        </Button>
      </div>
    </div>
  );
}