import { useListLessons } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle2, Lock, Play, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Lessons() {
  const { data: lessons, isLoading } = useListLessons();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 mb-8" />
        <Skeleton className="h-10 w-full max-w-md mx-auto mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!lessons) return null;

  const levels = [1, 2, 3];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Хичээлүүд</h1>
        <p className="text-muted-foreground mt-1">
          90 өдрийн хөтөлбөр. Түвшин бүр 30 хичээл болон нэгдсэн шалгалтаас бүрдэнэ.
        </p>
      </div>

      <Tabs defaultValue="1" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto mb-8">
          <TabsTrigger value="1">Түвшин 1</TabsTrigger>
          <TabsTrigger value="2">Түвшин 2</TabsTrigger>
          <TabsTrigger value="3">Түвшин 3</TabsTrigger>
        </TabsList>
        
        {levels.map((level) => {
          const levelLessons = lessons.filter((l) => l.level === level);
          const completedCount = levelLessons.filter((l) => l.completed).length;
          
          return (
            <TabsContent key={level} value={level.toString()} className="space-y-8 mt-0 focus-visible:outline-none">
              
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-xl font-semibold">Түвшин {level} (Өдөр {(level-1)*30 + 1} - {level*30})</h2>
                <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
                  {completedCount} / 30 дууссан
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {levelLessons.map((lesson) => (
                  <Link 
                    key={lesson.id} 
                    href={lesson.isUnlocked ? `/lessons/${lesson.id}` : "/billing"}
                    className="block"
                  >
                    <Card className={`h-full transition-all duration-200 border-2 ${
                      lesson.completed 
                        ? 'border-primary/20 bg-primary/5 hover:border-primary/50' 
                        : lesson.isUnlocked 
                          ? 'hover:border-primary hover:shadow-md' 
                          : 'opacity-70 hover:border-secondary hover:opacity-100'
                    }`}>
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-sm font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border">
                            Өдөр {lesson.day}
                          </div>
                          {lesson.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : !lesson.isUnlocked ? (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Play className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        <h3 className="font-semibold leading-tight mb-1">{lesson.titleMn}</h3>
                        <p className="text-xs text-muted-foreground mb-4 flex-1">{lesson.titleEn}</p>
                        
                        <div className="flex items-center justify-between text-xs mt-auto pt-4 border-t border-border/50">
                          <span className="text-muted-foreground">{lesson.durationMinutes} мин</span>
                          {lesson.bestScore !== null ? (
                            <span className="font-medium flex items-center gap-1">
                              <Star className="w-3 h-3 text-secondary fill-secondary" /> {lesson.bestScore}%
                            </span>
                          ) : lesson.isPremium && !lesson.isUnlocked ? (
                            <span className="font-medium text-secondary-foreground flex items-center gap-1 bg-secondary/10 px-1.5 py-0.5 rounded">
                              <Lock className="w-3 h-3" /> Level {lesson.level}
                            </span>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {completedCount === 30 && (
                <div className="mt-8 flex justify-center">
                  <Link href={`/final-tests/${level}`}>
                    <Card className="border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer max-w-md w-full">
                      <CardContent className="p-6 flex items-center justify-center gap-4 text-center">
                        <Star className="w-8 h-8 fill-primary-foreground text-primary-foreground" />
                        <div>
                          <h3 className="font-bold text-lg">Түвшин {level} Шалгалт өгөх</h3>
                          <p className="text-primary-foreground/80 text-sm">Дараагийн түвшинд шилжихийн тулд шалгалт өгнө үү</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}