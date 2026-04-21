import { useState } from "react";
import {
  useAdminListLessons,
  useAdminDeleteLesson,
  useAdminCreateLesson,
  useAdminUpdateLesson,
  getAdminListLessonsQueryKey,
  useAdminListPaymentRequests,
  useAdminDecidePaymentRequest,
  useAdminListStudents,
  useAdminGetStudent,
  useAdminUnlockStudentProduct,
  useAdminResetStudentProgress,
  useAdminDuplicateLesson,
  getAdminListPaymentRequestsQueryKey,
  getAdminListStudentsQueryKey,
  getAdminGetStudentQueryKey,
  type AdminPaymentRequest,
  type AdminStudentSummary,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Copy, CheckCircle2, XCircle, Eye, Unlock, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function formatVocabulary(vocabulary: any[]) {
  return (vocabulary || []).map((item) => [item.english, item.pronunciation || "", item.mongolian, item.example].join(" | ")).join("\n");
}
function parseVocabulary(value: string) {
  return value.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [english = "", pronunciation = "", mongolian = "", example = ""] = line.split("|").map((p) => p.trim());
    return { english, pronunciation, mongolian, example };
  }).filter((item) => item.english && item.mongolian && item.example);
}
function formatQuiz(quiz: any[]) {
  return (quiz || []).map((item) => [item.promptEn, item.promptMn, (item.options || []).join("; "), item.correctAnswer || ""].join(" | ")).join("\n");
}
function parseQuiz(value: string) {
  return value.split("\n").map((l, i) => ({ line: l.trim(), index: i })).filter(({ line }) => line).map(({ line, index }) => {
    const [promptEn = "", promptMn = "", optionsText = "", correctAnswer = ""] = line.split("|").map((p) => p.trim());
    const options = optionsText.split(";").map((o) => o.trim()).filter(Boolean);
    return { id: `admin-q-${index + 1}`, promptEn, promptMn, options, correctAnswer };
  }).filter((item) => item.promptEn && item.promptMn && item.options.length > 0 && item.correctAnswer);
}

const emptyLessonContent = {
  page1: { grammarTopic: "", grammarExplanation: "", grammarTable: [], quickPractice: [], commonMistakes: [], answerKey: [] },
  page2: { readingPassage: "", keyPhrases: [], speakingQuestions: [], rolePlay: [], speakingTip: "" },
  page3: { listeningScript: "", listeningQuestions: [], comprehensionQuestions: [], grammarPractice: [], matchingExercise: [], homework: [], answerKey: [], completionSummary: [], nextLessonPreview: "" },
};

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

export default function Admin() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Админ удирдлага</h1>
        <p className="text-muted-foreground mt-1">Хичээл, төлбөр, сурагч, шалгалтыг удирдах</p>
      </div>
      <Tabs defaultValue="payments">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="payments">Төлбөр</TabsTrigger>
          <TabsTrigger value="students">Сурагчид</TabsTrigger>
          <TabsTrigger value="lessons">Хичээлүүд</TabsTrigger>
          <TabsTrigger value="finalTests">Шалгалт</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-6"><PaymentsPanel /></TabsContent>
        <TabsContent value="students" className="mt-6"><StudentsPanel /></TabsContent>
        <TabsContent value="lessons" className="mt-6"><LessonsPanel /></TabsContent>
        <TabsContent value="finalTests" className="mt-6"><FinalTestsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentsPanel() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const { data, isLoading, refetch } = useAdminListPaymentRequests({ status });
  const decide = useAdminDecidePaymentRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [adminNote, setAdminNote] = useState("");

  const handleDecide = async (req: AdminPaymentRequest, dec: "approve" | "reject") => {
    setDecidingId(req.id);
    setDecision(dec);
    setAdminNote("");
  };

  const submitDecision = async () => {
    if (!decidingId) return;
    try {
      await decide.mutateAsync({ requestId: decidingId, data: { decision, adminNote: adminNote.trim() || undefined } });
      toast({ title: decision === "approve" ? "Баталгаажуулсан" : "Татгалзсан", description: decision === "approve" ? "Контент автоматаар нээгдсэн." : "Татгалзсан тэмдэглэгдсэн." });
      setDecidingId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getAdminListPaymentRequestsQueryKey({ status: "pending" }) }),
        queryClient.invalidateQueries({ queryKey: getAdminListStudentsQueryKey() }),
        refetch(),
      ]);
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message || "Боловсруулж чадсангүй.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle>Төлбөрийн хүсэлтүүд</CardTitle>
          <CardDescription>Хаан банкны шилжүүлгийн хүсэлтийг шалгаж баталгаажуулна уу.</CardDescription>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Хүлээгдэж байна</SelectItem>
            <SelectItem value="approved">Баталгаажсан</SelectItem>
            <SelectItem value="rejected">Татгалзсан</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40 w-full" /> : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Жагсаалт хоосон.</p>
        ) : (
          <div className="space-y-3">
            {(data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{r.userName} <span className="text-xs text-muted-foreground">({r.userEmail})</span></p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("mn-MN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{r.productName}</p>
                    <p className="font-bold">{formatMnt(r.amount)}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Гүйлгээний дугаар: </span><span className="font-mono">{r.transactionRef ?? "-"}</span></div>
                  <div><span className="text-muted-foreground">Төлөгч: </span>{r.payerName ?? "-"}</div>
                  {r.note && <div className="sm:col-span-2"><span className="text-muted-foreground">Тайлбар: </span>{r.note}</div>}
                  {r.screenshotUrl && <div className="sm:col-span-2"><a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="text-primary underline">Баримт зураг харах</a></div>}
                  {r.adminNote && <div className="sm:col-span-2 rounded bg-muted/40 p-2"><span className="text-muted-foreground">Админ: </span>{r.adminNote}</div>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleDecide(r, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" /> Баталгаажуулах</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDecide(r, "reject")}><XCircle className="w-4 h-4 mr-1" /> Татгалзах</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!decidingId} onOpenChange={(o) => !o && setDecidingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decision === "approve" ? "Төлбөр баталгаажуулах" : "Төлбөр татгалзах"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Тэмдэглэл (заавал биш)</Label>
            <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} placeholder={decision === "reject" ? "Татгалзсан шалтгаан..." : ""} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecidingId(null)}>Болих</Button>
            <Button variant={decision === "approve" ? "default" : "destructive"} onClick={submitDecision} disabled={decide.isPending}>{decide.isPending ? "..." : "Илгээх"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StudentsPanel() {
  const { data, isLoading } = useAdminListStudents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Сурагчид</CardTitle>
        <CardDescription>Бүх бүртгэлтэй сурагчид. Дэлгэрэнгүйг харахын тулд нэр дээр дарна уу.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Нэр</TableHead><TableHead>Email</TableHead>
                <TableHead>Түвшин</TableHead><TableHead>Дууссан</TableHead>
                <TableHead>Багц</TableHead><TableHead>Хүлээгдэж буй</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data ?? []).map((s: AdminStudentSummary) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.email}</TableCell>
                    <TableCell>{s.placementLevel || "-"}</TableCell>
                    <TableCell>{s.completedLessons}</TableCell>
                    <TableCell>{s.unlocks.length > 0 ? <div className="flex flex-wrap gap-1">{s.unlocks.map((u) => <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>)}</div> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell>{s.pendingPaymentRequests > 0 ? <Badge>{s.pendingPaymentRequests}</Badge> : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedId(s.id)}><Eye className="w-4 h-4 mr-1" />Дэлгэрэнгүй</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Сурагч байхгүй.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <StudentDetailDialog studentId={selectedId} onClose={() => setSelectedId(null)} />
    </Card>
  );
}

function StudentDetailDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const { data, isLoading } = useAdminGetStudent(studentId ?? "", { query: { enabled: !!studentId } });
  const unlock = useAdminUnlockStudentProduct();
  const reset = useAdminResetStudentProgress();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [unlockProductId, setUnlockProductId] = useState("level:1");

  const handleUnlock = async () => {
    if (!studentId) return;
    try {
      await unlock.mutateAsync({ userId: studentId, data: { productId: unlockProductId } });
      toast({ title: "Нээгдлээ", description: `${unlockProductId} нээгдлээ.` });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getAdminGetStudentQueryKey(studentId) }),
        queryClient.invalidateQueries({ queryKey: getAdminListStudentsQueryKey() }),
      ]);
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message ?? "Нээж чадсангүй.", variant: "destructive" });
    }
  };

  const handleReset = async () => {
    if (!studentId || !confirm("Сурагчийн ахиц дэвшлийг бүрэн арилгах уу?")) return;
    try {
      await reset.mutateAsync({ userId: studentId });
      toast({ title: "Сэргээгдлээ", description: "Сурагчийн ахиц цэвэрлэгдлээ." });
      await queryClient.invalidateQueries({ queryKey: getAdminGetStudentQueryKey(studentId) });
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message ?? "Сэргээж чадсангүй.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{data?.name ?? "Сурагчийн дэлгэрэнгүй"}</DialogTitle></DialogHeader>
        {isLoading || !data ? <Skeleton className="h-60 w-full" /> : (
          <div className="space-y-5 py-2">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Email: </span>{data.email}</div>
              <div><span className="text-muted-foreground">Эрх: </span>{data.role}</div>
              <div><span className="text-muted-foreground">Шатлалын түвшин: </span>{data.placementLevel || "—"}</div>
              <div><span className="text-muted-foreground">Дууссан хичээл: </span>{data.completedLessons}</div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold mb-2">Нээлттэй багцууд</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {data.unlocks.length === 0 ? <span className="text-xs text-muted-foreground">Нээлтгүй</span> :
                  data.unlocks.map((u) => <Badge key={u} variant="secondary">{u}</Badge>)}
              </div>
              <div className="flex items-center gap-2">
                <Select value={unlockProductId} onValueChange={setUnlockProductId}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="level:1">Level 1</SelectItem>
                    <SelectItem value="level:2">Level 2</SelectItem>
                    <SelectItem value="level:3">Level 3</SelectItem>
                    <SelectItem value="course:full">Бүтэн курс</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleUnlock} disabled={unlock.isPending}><Unlock className="w-4 h-4 mr-1" />Гараар нээх</Button>
                <Button size="sm" variant="destructive" onClick={handleReset} disabled={reset.isPending}><RotateCcw className="w-4 h-4 mr-1" />Ахиц сэргээх</Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Төлбөрийн хүсэлтүүд</p>
              {data.paymentRequests.length === 0 ? <p className="text-xs text-muted-foreground">Хүсэлт байхгүй.</p> : (
                <div className="space-y-2">
                  {data.paymentRequests.map((p) => (
                    <div key={p.id} className="rounded border p-2 text-sm flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.productName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString("mn-MN")} · {p.transactionRef}</p>
                      </div>
                      <div className="flex items-center gap-2"><span className="font-semibold">{formatMnt(p.amount)}</span><Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Шалгалтын түүх</p>
              {data.history.length === 0 ? <p className="text-xs text-muted-foreground">Бүртгэл байхгүй.</p> : (
                <div className="space-y-1.5">
                  {data.history.map((h, i) => (
                    <div key={i} className="text-sm flex items-center justify-between border-b py-1.5">
                      <span>{h.type}{h.level ? ` · L${h.level}` : ""}</span>
                      <span className="font-mono">{h.score}/{h.totalQuestions ?? "?"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LessonsPanel() {
  const { data: lessons, isLoading } = useAdminListLessons();
  const deleteLesson = useAdminDeleteLesson();
  const createLesson = useAdminCreateLesson();
  const updateLesson = useAdminUpdateLesson();
  const duplicate = useAdminDuplicateLesson();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [dupDay, setDupDay] = useState(1);
  const [dupTitleEn, setDupTitleEn] = useState("");
  const [dupTitleMn, setDupTitleMn] = useState("");

  const [formData, setFormData] = useState<any>({
    day: 1, level: 1, titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "",
    contentEn: "", contentMn: "", lessonContent: emptyLessonContent,
    pdfUrl: null, audioUrl: null, durationMinutes: 60, isPremium: false, vocabulary: [], quiz: [],
  });

  const handleOpenCreate = () => {
    setFormData({ day: 1, level: 1, titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "", contentEn: "", contentMn: "", lessonContent: emptyLessonContent, pdfUrl: null, audioUrl: null, durationMinutes: 60, isPremium: false, vocabulary: [], quiz: [] });
    setEditingLessonId(null);
    setIsDialogOpen(true);
  };
  const handleOpenEdit = (lesson: any) => {
    setFormData({
      day: lesson.day, level: lesson.level,
      titleEn: lesson.titleEn, titleMn: lesson.titleMn,
      objectiveEn: lesson.objectiveEn || "", objectiveMn: lesson.objectiveMn || "",
      contentEn: lesson.contentEn || "", contentMn: lesson.contentMn || "",
      lessonContent: lesson.lessonContent || emptyLessonContent,
      pdfUrl: lesson.pdfUrl || null, audioUrl: lesson.audioUrl || null,
      durationMinutes: lesson.durationMinutes, isPremium: lesson.isPremium,
      vocabulary: lesson.vocabulary || [], quiz: lesson.quiz || [],
    });
    setEditingLessonId(lesson.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`"${title}" хичээлийг устгах уу?`)) return;
    deleteLesson.mutate({ lessonId: id }, {
      onSuccess: () => { toast({ title: "Устгагдлаа" }); queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() }); },
      onError: () => toast({ title: "Алдаа", variant: "destructive" }),
    });
  };

  const handleSave = () => {
    const { lessonContentText, ...payload } = formData as any;
    const op = editingLessonId
      ? updateLesson.mutateAsync({ lessonId: editingLessonId, data: payload })
      : createLesson.mutateAsync({ data: payload });
    op.then(() => {
      toast({ title: editingLessonId ? "Шинэчлэгдлээ" : "Үүслээ" });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
    }).catch(() => toast({ title: "Алдаа", variant: "destructive" }));
  };

  const handleDuplicate = async () => {
    if (!duplicatingId) return;
    try {
      await duplicate.mutateAsync({ lessonId: duplicatingId, data: { day: dupDay, titleEn: dupTitleEn || undefined, titleMn: dupTitleMn || undefined } });
      toast({ title: "Хуулагдлаа" });
      setDuplicatingId(null);
      queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message ?? "Хуулж чадсангүй.", variant: "destructive" });
    }
  };

  const handleLessonContentChange = (value: string) => {
    try { setFormData({ ...formData, lessonContent: JSON.parse(value), lessonContentText: undefined }); }
    catch { setFormData({ ...formData, lessonContentText: value }); }
  };
  const handleFileUpload = (file: File | undefined, key: "pdfUrl" | "audioUrl") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, [key]: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Хичээлүүд</CardTitle>
          <CardDescription>Бүх 90 өдрийн хичээлийн контент.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" />Шинэ хичээл</Button></DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingLessonId ? "Хичээл засах" : "Шинэ хичээл"}</DialogTitle></DialogHeader>
            <div className="grid gap-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Өдөр</Label><Input type="number" value={formData.day} onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) || 1 })} /></div>
                <div className="space-y-1.5"><Label>Түвшин</Label><Input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Гарчиг (EN)</Label><Input value={formData.titleEn} onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Гарчиг (MN)</Label><Input value={formData.titleMn} onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Зорилго (EN)</Label><Textarea value={formData.objectiveEn} onChange={(e) => setFormData({ ...formData, objectiveEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Зорилго (MN)</Label><Textarea value={formData.objectiveMn} onChange={(e) => setFormData({ ...formData, objectiveMn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Агуулга (EN)</Label><Textarea className="min-h-32" value={formData.contentEn} onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Агуулга (MN)</Label><Textarea className="min-h-32" value={formData.contentMn} onChange={(e) => setFormData({ ...formData, contentMn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Хугацаа (минут)</Label><Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })} /></div>
                <div className="flex items-end gap-2"><Checkbox id="premium" checked={formData.isPremium} onCheckedChange={(c) => setFormData({ ...formData, isPremium: !!c })} /><Label htmlFor="premium">Premium хичээл</Label></div>
              </div>
              <div className="space-y-1.5">
                <Label>20 шинэ үг (мөр бүр: English | pronunciation | Mongolian | example)</Label>
                <Textarea className="min-h-40 font-mono text-xs" value={formatVocabulary(formData.vocabulary)} onChange={(e) => setFormData({ ...formData, vocabulary: parseVocabulary(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>3 хуудаст контент JSON (page1, page2, page3 — page3.listeningQuestions нэмэх боломжтой)</Label>
                <Textarea className="min-h-72 font-mono text-xs" value={(formData as any).lessonContentText ?? JSON.stringify(formData.lessonContent || emptyLessonContent, null, 2)} onChange={(e) => handleLessonContentChange(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>PDF (заавал биш)</Label>
                  <Input type="file" accept="application/pdf" onChange={(e) => handleFileUpload(e.target.files?.[0], "pdfUrl")} />
                  {formData.pdfUrl && <div className="flex items-center justify-between rounded-md border p-2 text-xs"><span>PDF хадгалагдсан</span><Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, pdfUrl: null })}>Устгах</Button></div>}
                </div>
                <div className="space-y-1.5">
                  <Label>Listening аудио (заавал биш)</Label>
                  <Input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files?.[0], "audioUrl")} />
                  {formData.audioUrl && <div className="flex items-center justify-between rounded-md border p-2 text-xs"><span>Аудио хадгалагдсан</span><Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, audioUrl: null })}>Устгах</Button></div>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Quiz (мөр бүр: EN | MN | A;B;C | correctAnswer)</Label>
                <Textarea className="min-h-32 font-mono text-xs" value={formatQuiz(formData.quiz)} onChange={(e) => setFormData({ ...formData, quiz: parseQuiz(e.target.value) })} />
              </div>
              <div className="flex justify-end"><Button onClick={handleSave}>{editingLessonId ? "Шинэчлэх" : "Үүсгэх"}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-60 w-full" /> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Өдөр</TableHead><TableHead>Түвшин</TableHead><TableHead>Гарчиг</TableHead><TableHead>Төрөл</TableHead><TableHead className="text-right">Үйлдэл</TableHead></TableRow></TableHeader>
              <TableBody>
                {(lessons ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.day}</TableCell>
                    <TableCell>L{l.level}</TableCell>
                    <TableCell><div className="font-medium">{l.titleMn}</div><div className="text-xs text-muted-foreground">{l.titleEn}</div></TableCell>
                    <TableCell><Badge variant={l.isPremium ? "secondary" : "default"}>{l.isPremium ? "Premium" : "Үнэгүй"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="icon" title="Засах" onClick={() => handleOpenEdit(l)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" title="Хуулах" onClick={() => { setDuplicatingId(l.id); setDupDay(l.day + 1); setDupTitleEn(l.titleEn + " (copy)"); setDupTitleMn(l.titleMn + " (хуулбар)"); }}><Copy className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" title="Устгах" onClick={() => handleDelete(l.id, l.titleMn)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(lessons ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Хичээл байхгүй.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!duplicatingId} onOpenChange={(o) => !o && setDuplicatingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Хичээл хуулах</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Шинэ өдөр</Label><Input type="number" value={dupDay} onChange={(e) => setDupDay(parseInt(e.target.value) || 1)} /></div>
            <div className="space-y-1.5"><Label>Гарчиг (EN, заавал биш)</Label><Input value={dupTitleEn} onChange={(e) => setDupTitleEn(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Гарчиг (MN, заавал биш)</Label><Input value={dupTitleMn} onChange={(e) => setDupTitleMn(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicatingId(null)}>Болих</Button>
            <Button onClick={handleDuplicate} disabled={duplicate.isPending}>Хуулах</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FinalTestsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Шалгалтууд</CardTitle>
        <CardDescription>Level 1, 2, 3-ын төгсгөлийн шалгалтууд. Контентыг одоохондоо seed-ээр удирдаж байна.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>Сурагчид <code>/final-test/level-1</code>-д тухайн түвшний эрхтэй болсныхоо дараа нэвтэрнэ.</p>
        <p>Дараагийн шинэчлэлтэд: шалгалтын асуултуудыг энд шууд засварлах боломжтой болно.</p>
      </CardContent>
    </Card>
  );
}
