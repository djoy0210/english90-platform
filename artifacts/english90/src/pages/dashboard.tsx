import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, Lock, Medal, PlayCircle, Target, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Мэдээлэл ачааллахад алдаа гарлаа.</p>
        <Button onClick={() => window.location.reload()}>Дахин оролдох</Button>
      </div>
    );
  }

  const progressPercentage = (dashboard.completedDays / dashboard.totalDays) * 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Тавтай морил!</h1>
          <p className="text-muted-foreground mt-1">
            Таны 90 өдрийн аялал үргэлжилж байна. Та {dashboard.completedDays} өдрийг амжилттай давлаа.
          </p>
        </div>
        {!dashboard.premium && (
          <Button asChild variant="outline" className="border-secondary text-secondary-foreground hover:bg-secondary/10">
            <Link href="/billing">
              <Medal className="w-4 h-4 mr-2" />
              Premium идэвхжүүлэх
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 font-medium mb-1">Явц</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{dashboard.completedDays}</span>
                <span className="text-lg text-primary-foreground/70">/ {dashboard.totalDays}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground font-medium mb-1">Одоогийн түвшин</p>
              <span className="text-4xl font-bold text-foreground">Түвшин {dashboard.currentLevel}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Medal className="w-6 h-6 text-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground font-medium mb-1">Дундаж оноо</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{dashboard.averageScore}</span>
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Target className="w-6 h-6 text-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {dashboard.nextLesson && (
        <Card className="border-primary/20 shadow-md">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                Дараагийн хичээл • Өдөр {dashboard.nextLesson.day}
              </div>
              <h2 className="text-2xl font-bold mb-2">{dashboard.nextLesson.titleMn}</h2>
              <p className="text-muted-foreground mb-1">{dashboard.nextLesson.titleEn}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {dashboard.nextLesson.durationMinutes} мин</span>
                {!dashboard.premium && dashboard.nextLesson.isPremium && (
                  <span className="flex items-center gap-1 text-secondary-foreground bg-secondary/10 px-2 py-0.5 rounded"><Lock className="w-3 h-3" /> Premium</span>
                )}
              </div>
            </div>
            <Button asChild size="lg" className="w-full md:w-auto h-14 px-8 shrink-0">
              <Link href={`/lessons/${dashboard.nextLesson.id}`}>
                <PlayCircle className="w-5 h-5 mr-2" />
                Хичээл эхлэх
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Түвшний явц</CardTitle>
            <CardDescription>Нийт 3 түвшин (Түвшин бүр 30 өдөр)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {dashboard.levelProgress.map((level) => (
              <div key={level.level} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Түвшин {level.level}</span>
                  <span className="text-muted-foreground">{level.completed} / {level.total}</span>
                </div>
                <Progress value={(level.completed / level.total) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Сүүлийн үр дүнгүүд</CardTitle>
              <CardDescription>Таны өгсөн сүүлийн 5 шалгалт</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/history">Бүгд</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.recentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Одоогоор шалгалт өгөөгүй байна.
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {dashboard.recentHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.percentage >= 80 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {item.percentage >= 80 ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-none">{item.titleMn}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.type === 'final' ? `Түвшин ${item.level} шалгалт` : `Өдөр ${item.day}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${item.percentage >= 80 ? 'text-primary' : 'text-foreground'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
