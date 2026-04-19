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

function formatVocabulary(vocabulary: any[]) {
  return (vocabulary || [])
    .map((item) => [item.english, item.pronunciation || "", item.mongolian, item.example].join(" | "))
    .join("\n");
}

function parseVocabulary(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [english = "", pronunciation = "", mongolian = "", example = ""] = line.split("|").map((part) => part.trim());
      return { english, pronunciation, mongolian, example };
    })
    .filter((item) => item.english && item.mongolian && item.example);
}

function formatQuiz(quiz: any[]) {
  return (quiz || [])
    .map((item) => [item.promptEn, item.promptMn, (item.options || []).join("; "), item.correctAnswer || ""].join(" | "))
    .join("\n");
}

function parseQuiz(value: string) {
  return value
    .split("\n")
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => line)
    .map(({ line, index }) => {
      const [promptEn = "", promptMn = "", optionsText = "", correctAnswer = ""] = line.split("|").map((part) => part.trim());
      const options = optionsText.split(";").map((option) => option.trim()).filter(Boolean);
      return {
        id: `admin-q-${index + 1}`,
        promptEn,
        promptMn,
        options,
        correctAnswer,
      };
    })
    .filter((item) => item.promptEn && item.promptMn && item.options.length > 0 && item.correctAnswer);
}

const emptyLessonContent = {
  page1: {
    grammarTopic: "",
    grammarExplanation: "",
    grammarTable: [],
    quickPractice: [],
    commonMistakes: [],
    answerKey: [],
  },
  page2: {
    readingPassage: "",
    keyPhrases: [],
    speakingQuestions: [],
    rolePlay: [],
    speakingTip: "",
  },
  page3: {
    listeningScript: "",
    comprehensionQuestions: [],
    grammarPractice: [],
    matchingExercise: [],
    homework: [],
    answerKey: [],
    completionSummary: [],
    nextLessonPreview: "",
  },
};

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
    lessonContent: emptyLessonContent as any,
    pdfUrl: null as string | null,
    durationMinutes: 20,
    isPremium: false,
    vocabulary: [] as any[],
    quiz: [] as any[]
  });

  const handleOpenCreate = () => {
    setFormData({
      day: 1, level: 1, titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "", contentEn: "", contentMn: "", lessonContent: emptyLessonContent, pdfUrl: null, durationMinutes: 60, isPremium: false, vocabulary: [], quiz: []
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
      lessonContent: lesson.lessonContent || emptyLessonContent,
      pdfUrl: lesson.pdfUrl || null,
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
    const { lessonContentText, ...payload } = formData as any;
    if (editingLessonId) {
      updateLesson.mutate(
        { lessonId: editingLessonId, data: payload },
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
        { data: payload },
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

  const handleLessonContentChange = (value: string) => {
    try {
      setFormData({ ...formData, lessonContent: JSON.parse(value) });
    } catch {
      setFormData({ ...formData, lessonContentText: value } as any);
    }
  };

  const handlePdfUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, pdfUrl: String(reader.result) });
    reader.readAsDataURL(file);
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
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                  <Textarea className="min-h-40" value={formData.contentEn} onChange={(e) => setFormData({...formData, contentEn: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Агуулга (MN)</Label>
                  <Textarea className="min-h-40" value={formData.contentMn} onChange={(e) => setFormData({...formData, contentMn: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Хичээлийн хугацаа (минут)</Label>
                  <Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: parseInt(e.target.value) || 60})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>20 шинэ үг</Label>
                <p className="text-xs text-muted-foreground">
                  Мөр бүр: English | pronunciation | Mongolian meaning | example sentence
                </p>
                <Textarea
                  className="min-h-48 font-mono text-sm"
                  value={formatVocabulary(formData.vocabulary)}
                  onChange={(e) => setFormData({...formData, vocabulary: parseVocabulary(e.target.value)})}
                  placeholder={"Hello | /həˈloʊ/ | Сайн уу | Hello! My name is Bat.\nHi | /haɪ/ | Сайн уу | Hi! How are you?"}
                />
              </div>
              <div className="space-y-2">
                <Label>Reusable 3-page lesson template JSON</Label>
                <p className="text-xs text-muted-foreground">
                  Page 1, Page 2, Page 3 structured content. This powers the dynamic lesson page.
                </p>
                <Textarea
                  className="min-h-80 font-mono text-xs"
                  value={(formData as any).lessonContentText ?? JSON.stringify(formData.lessonContent || emptyLessonContent, null, 2)}
                  onChange={(e) => handleLessonContentChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Optional PDF upload / эх PDF</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => handlePdfUpload(e.target.files?.[0])} />
                {formData.pdfUrl && (
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>PDF attached</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, pdfUrl: null })}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Сорил / quiz questions</Label>
                <p className="text-xs text-muted-foreground">
                  Мөр бүр: Question EN | Question MN | option 1; option 2; option 3 | correct answer
                </p>
                <Textarea
                  className="min-h-40 font-mono text-sm"
                  value={formatQuiz(formData.quiz)}
                  onChange={(e) => setFormData({...formData, quiz: parseQuiz(e.target.value)})}
                  placeholder={"What is your name? | Таны нэр хэн бэ? | My name is Bat; I am fine; Goodbye | My name is Bat"}
                />
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