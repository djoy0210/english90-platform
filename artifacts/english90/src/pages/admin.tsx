import { useState } from "react";
import { useAdminListLessons, useAdminDeleteLesson, useAdminCreateLesson, useAdminUpdateLesson, getAdminListLessonsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const { data: lessons, isLoading } = useAdminListLessons();
  const deleteLesson = useAdminDeleteLesson();
  const createLesson = useAdminCreateLesson();
  const updateLesson = useAdminUpdateLesson();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    day: 1,
    level: 1,
    titleEn: "",
    titleMn: "",
    objectiveEn: "",
    objectiveMn: "",
    contentEn: "",
    contentMn: "",
    durationMinutes: 20,
    isPremium: false,
    vocabulary: [] as any[],
    quiz: [] as any[]
  });

  const handleOpenCreate = () => {
    setFormData({
      day: 1, level: 1, titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "", contentEn: "", contentMn: "", durationMinutes: 20, isPremium: false, vocabulary: [], quiz: []
    });
    setEditingLessonId(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (lesson: any) => {
    setFormData({
      day: lesson.day,
      level: lesson.level,
      titleEn: lesson.titleEn,
      titleMn: lesson.titleMn,
      objectiveEn: lesson.objectiveEn || "",
      objectiveMn: lesson.objectiveMn || "",
      contentEn: lesson.contentEn || "",
      contentMn: lesson.contentMn || "",
      durationMinutes: lesson.durationMinutes,
      isPremium: lesson.isPremium,
      vocabulary: lesson.vocabulary || [],
      quiz: lesson.quiz || []
    });
    setEditingLessonId(lesson.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Та "${title}" хичээлийг устгахдаа итгэлтэй байна уу?`)) {
      deleteLesson.mutate(
        { lessonId: id },
        {
          onSuccess: () => {
            toast({ title: "Устгагдлаа", description: "Хичээл амжилттай устгагдлаа." });
            queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
          },
          onError: () => {
            toast({ title: "Алдаа гарлаа", description: "Устгах үед алдаа гарлаа.", variant: "destructive" });
          }
        }
      );
    }
  };

  const handleSave = () => {
    if (editingLessonId) {
      updateLesson.mutate(
        { lessonId: editingLessonId, data: formData },
        {
          onSuccess: () => {
            toast({ title: "Хадгалагдлаа", description: "Хичээл амжилттай шинэчлэгдлээ." });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
          },
          onError: () => {
            toast({ title: "Алдаа", description: "Хадгалах үед алдаа гарлаа.", variant: "destructive" });
          }
        }
      );
    } else {
      createLesson.mutate(
        { data: formData },
        {
          onSuccess: () => {
            toast({ title: "Үүсгэгдлээ", description: "Хичээл амжилттай үүслээ." });
            setIsDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
          },
          onError: () => {
            toast({ title: "Алдаа", description: "Үүсгэх үед алдаа гарлаа.", variant: "destructive" });
          }
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Админ удирдлага</h1>
          <p className="text-muted-foreground mt-1">Хичээлүүд болон агуулгыг удирдах</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Шинэ хичээл
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLessonId ? "Хичээл засах" : "Шинэ хичээл"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Өдөр</Label>
                  <Input type="number" value={formData.day} onChange={(e) => setFormData({...formData, day: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-2">
                  <Label>Түвшин</Label>
                  <Input type="number" value={formData.level} onChange={(e) => setFormData({...formData, level: parseInt(e.target.value) || 1})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Гарчиг (EN)</Label>
                  <Input value={formData.titleEn} onChange={(e) => setFormData({...formData, titleEn: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Гарчиг (MN)</Label>
                  <Input value={formData.titleMn} onChange={(e) => setFormData({...formData, titleMn: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Зорилго (EN)</Label>
                  <Textarea value={formData.objectiveEn} onChange={(e) => setFormData({...formData, objectiveEn: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Зорилго (MN)</Label>
                  <Textarea value={formData.objectiveMn} onChange={(e) => setFormData({...formData, objectiveMn: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Агуулга (EN)</Label>
                  <Textarea value={formData.contentEn} onChange={(e) => setFormData({...formData, contentEn: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Агуулга (MN)</Label>
                  <Textarea value={formData.contentMn} onChange={(e) => setFormData({...formData, contentMn: e.target.value})} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="premium" checked={formData.isPremium} onCheckedChange={(checked) => setFormData({...formData, isPremium: !!checked})} />
                <Label htmlFor="premium">Premium хичээл эсэх</Label>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave}>{editingLessonId ? "Шинэчлэх" : "Үүсгэх"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Хичээлүүдийн жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
          {(!lessons || lessons.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              Хичээл бүртгэгдээгүй байна.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Өдөр</TableHead>
                    <TableHead>Түвшин</TableHead>
                    <TableHead>Гарчиг (MN/EN)</TableHead>
                    <TableHead>Төрөл</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-medium">{lesson.day}</TableCell>
                      <TableCell>Түвшин {lesson.level}</TableCell>
                      <TableCell>
                        <div className="font-medium">{lesson.titleMn}</div>
                        <div className="text-xs text-muted-foreground">{lesson.titleEn}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lesson.isPremium ? "secondary" : "default"}>
                          {lesson.isPremium ? "Premium" : "Үнэгүй"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="icon" title="Засах" onClick={() => handleOpenEdit(lesson)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10" 
                            title="Устгах"
                            onClick={() => handleDelete(lesson.id, lesson.titleMn)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}