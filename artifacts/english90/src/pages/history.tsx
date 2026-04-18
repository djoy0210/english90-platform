import { useGetTestHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Trophy, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const { data: history, isLoading } = useGetTestHistory();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!history) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Түүх</h1>
        <p className="text-muted-foreground mt-1">
          Таны өгсөн шалгалт болон өдрийн сорилуудын үр дүн.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Бүх үр дүн</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Одоогоор ямар нэг шалгалт эсвэл сорил өгөөгүй байна.
            </div>
          ) : (
            <div className="divide-y">
              {history.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center mt-1 ${
                      item.type === 'final' 
                        ? 'bg-secondary/20 text-secondary-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {item.type === 'final' ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={item.type === 'final' ? 'default' : 'outline'} className="text-[10px]">
                          {item.type === 'final' ? 'Нэгдсэн шалгалт' : 'Өдрийн сорил'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                        </span>
                      </div>
                      <h3 className="font-semibold">{item.titleMn}</h3>
                      <p className="text-sm text-muted-foreground">{item.titleEn}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pl-14 sm:pl-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-2xl font-bold">{item.percentage}%</span>
                        {item.percentage >= 80 ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.score} / {item.total} зөв
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}