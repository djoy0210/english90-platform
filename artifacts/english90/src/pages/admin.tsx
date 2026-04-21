import { useEffect, useState } from "react";
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
  useAdminListPlacementQuestions,
  useAdminCreatePlacementQuestion,
  useAdminUpdatePlacementQuestion,
  useAdminDeletePlacementQuestion,
  getAdminListPlacementQuestionsQueryKey,
  getAdminListPaymentRequestsQueryKey,
  getAdminListStudentsQueryKey,
  getAdminGetStudentQueryKey,
  type AdminPaymentRequest,
  type AdminStudentSummary,
  type AdminPlacementQuestion,
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

function parseVocabulary(value: string) {
  return value.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [english = "", pronunciation = "", mongolian = "", example = ""] = line.split("|").map((p) => p.trim());
    return { english, pronunciation, mongolian, example };
  }).filter((item) => item.english && item.mongolian && item.example);
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

const lessonJsonTemplate = {
  titleEn: "Greetings & Introductions",
  titleMn: "Мэндчилгээ ба танилцах",
  objectiveEn: "By the end of this lesson, you can greet people and introduce yourself.",
  objectiveMn: "Энэ хичээлийн төгсгөлд та мэндлэх, өөрийгөө танилцуулж чадна.",
  contentEn: "Short overview of today's lesson.",
  contentMn: "Өнөөдрийн хичээлийн товч тойм.",
  vocabulary: [
    { english: "hello", pronunciation: "həˈloʊ", mongolian: "сайн уу", example: "Hello, my name is Bat." },
  ],
  quiz: [
    { promptEn: "How do you say 'hello'?", promptMn: "‘hello’ гэж юу гэх вэ?", options: ["сайн уу", "баяртай"], correctAnswer: "сайн уу" },
  ],
  lessonContent: {
    page1: {
      grammarTopic: "Verb 'to be' — am / is / are",
      grammarExplanation: "We use am with I, is with he/she/it, are with you/we/they.",
      grammarTable: [
        { Subject: "I", Verb: "am", Example: "I am Bat." },
        { Subject: "He / She", Verb: "is", Example: "She is a teacher." },
        { Subject: "You / We / They", Verb: "are", Example: "They are students." },
      ],
      quickPractice: ["I ___ a student.", "She ___ from Mongolia.", "They ___ teachers."],
      commonMistakes: ["I is → I am", "She are → She is"],
      answerKey: ["am", "is", "are"],
    },
    page2: {
      readingPassage: "Hi! My name is Bat. I am from Ulaanbaatar...",
      keyPhrases: [
        { english: "Nice to meet you", mongolian: "Танилцахад таатай байна", note: "Use when meeting someone new" },
      ],
      speakingQuestions: ["What is your name?", "Where are you from?"],
      rolePlay: [
        { speaker: "A", text: "Hi, I'm Bat." },
        { speaker: "B", text: "Nice to meet you, Bat. I'm Sara." },
      ],
      speakingTip: "Speak slowly and smile.",
    },
    page3: {
      listeningScript: "Hello, my name is Sara. I am a student...",
      listeningQuestions: [
        { question: "What is her name?", answer: "Sara" },
      ],
      grammarPractice: ["He ___ a doctor.", "We ___ from Mongolia."],
      matchingExercise: [
        { left: "Hello", right: "Сайн уу" },
        { left: "Goodbye", right: "Баяртай" },
      ],
      homework: ["Write 5 sentences introducing yourself."],
      answerKey: ["is", "are"],
      completionSummary: ["Learned 20 new words", "Practiced introductions"],
      nextLessonPreview: "Tomorrow: numbers & age.",
    },
  },
};

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

function cleanStringList(arr: any): string[] {
  return Array.isArray(arr) ? arr.map((s) => (typeof s === "string" ? s : String(s ?? ""))).filter((s) => s.trim()) : [];
}
function cleanRowList(arr: any): any[] {
  return Array.isArray(arr) ? arr.filter((r) => r && typeof r === "object" && Object.values(r).some((v) => String(v ?? "").trim())) : [];
}
function cleanLessonContentForSave(lc: any): any {
  const p1 = lc?.page1 || {};
  const p2 = lc?.page2 || {};
  const p3 = lc?.page3 || {};
  return {
    page1: {
      grammarTopic: (p1.grammarTopic || "").trim(),
      grammarExplanation: (p1.grammarExplanation || "").trim(),
      grammarTable: cleanRowList(p1.grammarTable),
      quickPractice: cleanStringList(p1.quickPractice),
      commonMistakes: cleanStringList(p1.commonMistakes),
      answerKey: cleanStringList(p1.answerKey),
    },
    page2: {
      readingPassage: (p2.readingPassage || "").trim(),
      keyPhrases: cleanRowList(p2.keyPhrases),
      speakingQuestions: cleanStringList(p2.speakingQuestions),
      rolePlay: cleanRowList(p2.rolePlay),
      speakingTip: (p2.speakingTip || "").trim(),
    },
    page3: {
      listeningScript: (p3.listeningScript || "").trim(),
      listeningQuestions: cleanRowList(p3.listeningQuestions),
      comprehensionQuestions: cleanRowList(p3.comprehensionQuestions),
      grammarPractice: cleanStringList(p3.grammarPractice),
      matchingExercise: cleanRowList(p3.matchingExercise),
      homework: cleanStringList(p3.homework),
      answerKey: cleanStringList(p3.answerKey),
      completionSummary: cleanStringList(p3.completionSummary),
      nextLessonPreview: (p3.nextLessonPreview || "").trim(),
    },
  };
}

export default function Admin() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Админ удирдлага</h1>
        <p className="text-muted-foreground mt-1">Хичээл, төлбөр, сурагч, шалгалтыг удирдах</p>
      </div>
      <Tabs defaultValue="payments">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-3xl h-auto sm:h-10">
          <TabsTrigger value="payments">Төлбөр</TabsTrigger>
          <TabsTrigger value="students">Сурагчид</TabsTrigger>
          <TabsTrigger value="lessons">Хичээлүүд</TabsTrigger>
          <TabsTrigger value="placement">Түвшин тогтоох</TabsTrigger>
          <TabsTrigger value="finalTests">Шалгалт</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-6"><PaymentsPanel /></TabsContent>
        <TabsContent value="students" className="mt-6"><StudentsPanel /></TabsContent>
        <TabsContent value="lessons" className="mt-6"><LessonsPanel /></TabsContent>
        <TabsContent value="placement" className="mt-6"><PlacementPanel /></TabsContent>
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
  const { data, isLoading } = useAdminGetStudent(studentId ?? "", { query: { enabled: !!studentId, queryKey: getAdminGetStudentQueryKey(studentId ?? "") } });
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
                      <span className="font-mono">{h.score}/{h.total} ({h.percentage}%)</span>
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

const emptyVocabRow = () => ({ english: "", pronunciation: "", mongolian: "", example: "" });
const emptyQuizRow = (i: number) => ({ id: `admin-q-${i + 1}-${Math.random().toString(36).slice(2, 6)}`, promptEn: "", promptMn: "", options: ["", "", ""], correctAnswer: "" });

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
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [dupDay, setDupDay] = useState(1);
  const [dupTitleEn, setDupTitleEn] = useState("");
  const [dupTitleMn, setDupTitleMn] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("1");
  const [editorTab, setEditorTab] = useState<string>("basic");

  const [formData, setFormData] = useState<any>({
    day: 1, level: 1, titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "",
    contentEn: "", contentMn: "", lessonContent: emptyLessonContent,
    pdfUrl: null, audioUrl: null, durationMinutes: 60, isPremium: false, vocabulary: [], quiz: [],
  });

  const filteredLessons = (lessons ?? [])
    .filter((l) => levelFilter === "all" || l.level === parseInt(levelFilter))
    .sort((a, b) => a.level - b.level || a.day - b.day);

  const nextAvailableDay = (level: number) => {
    const start = (level - 1) * 30 + 1;
    const end = level * 30;
    const used = new Set((lessons ?? []).map((l) => l.day));
    for (let d = start; d <= end; d++) if (!used.has(d)) return d;
    return end;
  };

  const handleOpenCreate = () => {
    const lvl = levelFilter === "all" ? 1 : parseInt(levelFilter);
    setFormData({
      day: nextAvailableDay(lvl), level: lvl,
      titleEn: "", titleMn: "", objectiveEn: "", objectiveMn: "",
      contentEn: "", contentMn: "", lessonContent: emptyLessonContent,
      pdfUrl: null, audioUrl: null, durationMinutes: 60, isPremium: lvl > 1 || nextAvailableDay(lvl) > 1,
      vocabulary: Array.from({ length: 20 }, emptyVocabRow),
      quiz: Array.from({ length: 5 }, (_, i) => emptyQuizRow(i)),
    });
    setEditingLessonId(null);
    setEditorTab("basic");
    setIsDialogOpen(true);
  };
  const handleOpenEdit = (lesson: any) => {
    const answersByQuestion = new Map<string, string>(
      (lesson.correctAnswers || []).map((a: any) => [a.questionId, a.answer])
    );
    const quizWithAnswers = (lesson.quiz || []).map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", ""],
      correctAnswer: q.correctAnswer ?? answersByQuestion.get(q.id) ?? "",
    }));
    setFormData({
      day: lesson.day, level: lesson.level,
      titleEn: lesson.titleEn, titleMn: lesson.titleMn,
      objectiveEn: lesson.objectiveEn || "", objectiveMn: lesson.objectiveMn || "",
      contentEn: lesson.contentEn || "", contentMn: lesson.contentMn || "",
      lessonContent: lesson.lessonContent || emptyLessonContent,
      pdfUrl: lesson.pdfUrl || null, audioUrl: lesson.audioUrl || null,
      durationMinutes: lesson.durationMinutes, isPremium: lesson.isPremium,
      vocabulary: lesson.vocabulary || [], quiz: quizWithAnswers,
    });
    setEditingLessonId(lesson.id);
    setEditorTab("basic");
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
    const { lessonContentText, ...rest } = formData as any;
    const cleanVocab = (rest.vocabulary || []).filter((v: any) => v.english?.trim() && v.mongolian?.trim() && v.example?.trim());
    const cleanQuiz = (rest.quiz || [])
      .map((q: any, i: number) => {
        const options = (q.options || []).map((o: string) => (o || "").trim()).filter(Boolean);
        const correctAnswer = (q.correctAnswer || "").trim();
        return { ...q, id: q.id || `admin-q-${i + 1}`, options, correctAnswer };
      })
      .filter((q: any) => q.promptEn?.trim() && q.promptMn?.trim() && q.options.length >= 2 && q.correctAnswer && q.options.includes(q.correctAnswer));
    const cleanLessonContent = cleanLessonContentForSave(rest.lessonContent || emptyLessonContent);
    const payload = { ...rest, vocabulary: cleanVocab, quiz: cleanQuiz, lessonContent: cleanLessonContent };
    const op = editingLessonId
      ? updateLesson.mutateAsync({ lessonId: editingLessonId, data: payload })
      : createLesson.mutateAsync({ data: payload });
    op.then(() => {
      toast({ title: editingLessonId ? "Шинэчлэгдлээ" : "Үүслээ", description: `${cleanVocab.length} үг · ${cleanQuiz.length} асуулт` });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
    }).catch((err: any) => toast({ title: "Алдаа", description: err?.message ?? "Хадгалж чадсангүй.", variant: "destructive" }));
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

  const handleQuickDuplicate = async (lesson: any) => {
    const targetDay = nextAvailableDay(lesson.level);
    try {
      await duplicate.mutateAsync({ lessonId: lesson.id, data: { day: targetDay, titleEn: `${lesson.titleEn} (copy)`, titleMn: `${lesson.titleMn} (хуулбар)` } });
      toast({ title: `Өдөр ${targetDay} рүү хуулагдлаа` });
      queryClient.invalidateQueries({ queryKey: getAdminListLessonsQueryKey() });
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message ?? "Хуулж чадсангүй.", variant: "destructive" });
    }
  };

  const handleFileUpload = (file: File | undefined, key: "pdfUrl" | "audioUrl") => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, [key]: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const previewUrl = (id: string) => `${import.meta.env.BASE_URL}lessons/${id}`;

  const levelCounts = [1, 2, 3].map((lv) => ({ lv, count: (lessons ?? []).filter((l) => l.level === lv).length }));

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle>Хичээлүүд</CardTitle>
          <CardDescription>
            {levelCounts.map((c) => `L${c.lv}: ${c.count}/30`).join(" · ")}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх түвшин</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" />Шинэ хичээл</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-60 w-full" /> : (
          <div className="rounded-md border overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-16">Өдөр</TableHead>
                  <TableHead className="w-16">Түвшин</TableHead>
                  <TableHead>Гарчиг</TableHead>
                  <TableHead className="w-20">Үг</TableHead>
                  <TableHead className="w-20">Quiz</TableHead>
                  <TableHead className="w-24">Төрөл</TableHead>
                  <TableHead className="text-right w-44">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map((l) => {
                  const vocabCount = (l.vocabulary || []).length;
                  const quizCount = (l.quiz || []).length;
                  const incomplete = vocabCount < 20 || quizCount < 5;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.day}</TableCell>
                      <TableCell>L{l.level}</TableCell>
                      <TableCell><div className="font-medium">{l.titleMn}</div><div className="text-xs text-muted-foreground">{l.titleEn}</div></TableCell>
                      <TableCell><span className={vocabCount < 20 ? "text-amber-600 font-mono text-sm" : "font-mono text-sm"}>{vocabCount}/20</span></TableCell>
                      <TableCell><span className={quizCount < 5 ? "text-amber-600 font-mono text-sm" : "font-mono text-sm"}>{quizCount}</span></TableCell>
                      <TableCell><Badge variant={l.isPremium ? "secondary" : "default"}>{l.isPremium ? "Premium" : "Үнэгүй"}</Badge>{incomplete && <Badge variant="outline" className="ml-1 text-amber-600 border-amber-600">Дутуу</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="icon" title="Урьдчилан харах" onClick={() => window.open(previewUrl(l.id), "_blank")}><Eye className="w-4 h-4" /></Button>
                          <Button variant="outline" size="icon" title="Засах" onClick={() => handleOpenEdit(l)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="outline" size="icon" title={`Дараагийн хоосон өдөр рүү хуулах (Өдөр ${nextAvailableDay(l.level)})`} onClick={() => handleQuickDuplicate(l)} disabled={duplicate.isPending}><Copy className="w-4 h-4" /></Button>
                          <Button variant="outline" size="icon" title="Тусгай хуулах…" onClick={() => { setDuplicatingId(l.id); setDupDay(nextAvailableDay(l.level)); setDupTitleEn(l.titleEn + " (copy)"); setDupTitleMn(l.titleMn + " (хуулбар)"); }}><Plus className="w-4 h-4" /></Button>
                          <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" title="Устгах" onClick={() => handleDelete(l.id, l.titleMn)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLessons.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Хичээл байхгүй.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {editingLessonId ? "Хичээл засах" : "Шинэ хичээл"}
              <Badge variant="outline">L{formData.level} · Өдөр {formData.day}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setJsonImportOpen(true)}>
                  <Copy className="w-4 h-4 mr-1" />JSON ачаалах
                </Button>
                {editingLessonId && (
                  <Button variant="outline" size="sm" onClick={() => window.open(previewUrl(editingLessonId), "_blank")}>
                    <Eye className="w-4 h-4 mr-1" />Урьдчилан харах
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <Tabs value={editorTab} onValueChange={setEditorTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="basic">Үндсэн</TabsTrigger>
              <TabsTrigger value="vocab">Үг ({(formData.vocabulary || []).filter((v: any) => v.english?.trim()).length}/20)</TabsTrigger>
              <TabsTrigger value="quiz">Quiz ({(formData.quiz || []).filter((q: any) => q.promptEn?.trim()).length})</TabsTrigger>
              <TabsTrigger value="content">3 хуудас</TabsTrigger>
              <TabsTrigger value="files">Файл</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label>Өдөр</Label><Input type="number" value={formData.day} onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) || 1 })} /></div>
                <div className="space-y-1.5"><Label>Түвшин</Label><Input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })} /></div>
                <div className="space-y-1.5"><Label>Хугацаа (мин)</Label><Input type="number" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })} /></div>
                <div className="flex items-end gap-2 pb-2"><Checkbox id="premium" checked={formData.isPremium} onCheckedChange={(c) => setFormData({ ...formData, isPremium: !!c })} /><Label htmlFor="premium">Premium</Label></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Гарчиг (EN)</Label><Input value={formData.titleEn} onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Гарчиг (MN)</Label><Input value={formData.titleMn} onChange={(e) => setFormData({ ...formData, titleMn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Зорилго (EN)</Label><Textarea rows={2} value={formData.objectiveEn} onChange={(e) => setFormData({ ...formData, objectiveEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Зорилго (MN)</Label><Textarea rows={2} value={formData.objectiveMn} onChange={(e) => setFormData({ ...formData, objectiveMn: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Тойм (EN)</Label><Textarea rows={3} value={formData.contentEn} onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Тойм (MN)</Label><Textarea rows={3} value={formData.contentMn} onChange={(e) => setFormData({ ...formData, contentMn: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="vocab" className="space-y-3 py-4">
              <VocabEditor
                vocabulary={formData.vocabulary || []}
                onChange={(v) => setFormData({ ...formData, vocabulary: v })}
              />
            </TabsContent>

            <TabsContent value="quiz" className="space-y-3 py-4">
              <QuizEditor
                quiz={formData.quiz || []}
                onChange={(q) => setFormData({ ...formData, quiz: q })}
              />
            </TabsContent>

            <TabsContent value="content" className="space-y-2 py-4">
              <LessonContentEditor
                value={formData.lessonContent || emptyLessonContent}
                onChange={(lc) => setFormData({ ...formData, lessonContent: lc })}
              />
            </TabsContent>

            <TabsContent value="files" className="space-y-4 py-4">
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
            </TabsContent>
          </Tabs>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Болих</Button>
            <Button onClick={handleSave} disabled={createLesson.isPending || updateLesson.isPending}>{editingLessonId ? "Шинэчлэх" : "Үүсгэх"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LessonJsonImportDialog
        open={jsonImportOpen}
        onOpenChange={setJsonImportOpen}
        onApply={(data) => {
          setFormData((prev: any) => {
            const next = { ...prev };
            for (const k of ["titleEn","titleMn","objectiveEn","objectiveMn","contentEn","contentMn","durationMinutes","day","level","isPremium","pdfUrl","audioUrl"]) {
              if (data[k] !== undefined) next[k] = data[k];
            }
            if (Array.isArray(data.vocabulary)) {
              next.vocabulary = data.vocabulary.map((v: any) => ({
                english: v.english || "", pronunciation: v.pronunciation || "",
                mongolian: v.mongolian || "", example: v.example || "",
              }));
            }
            if (Array.isArray(data.quiz)) {
              next.quiz = data.quiz.map((q: any, i: number) => ({
                id: q.id || `admin-q-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
                promptEn: q.promptEn || "", promptMn: q.promptMn || "",
                options: Array.isArray(q.options) ? q.options : ["", "", ""],
                correctAnswer: q.correctAnswer || "",
              }));
            }
            if (data.lessonContent && typeof data.lessonContent === "object") {
              const prevLc = prev.lessonContent || emptyLessonContent;
              next.lessonContent = {
                page1: data.lessonContent.page1 ? { ...emptyLessonContent.page1, ...data.lessonContent.page1 } : prevLc.page1,
                page2: data.lessonContent.page2 ? { ...emptyLessonContent.page2, ...data.lessonContent.page2 } : prevLc.page2,
                page3: data.lessonContent.page3 ? { ...emptyLessonContent.page3, ...data.lessonContent.page3 } : prevLc.page3,
              };
            }
            return next;
          });
        }}
      />

      <Dialog open={!!duplicatingId} onOpenChange={(o) => !o && setDuplicatingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Тусгай хуулах</DialogTitle></DialogHeader>
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

function VocabEditor({ vocabulary, onChange }: { vocabulary: any[]; onChange: (v: any[]) => void }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const update = (idx: number, key: string, val: string) => {
    const next = [...vocabulary];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const remove = (idx: number) => onChange(vocabulary.filter((_, i) => i !== idx));
  const add = () => onChange([...vocabulary, emptyVocabRow()]);
  const fill20 = () => {
    const needed = 20 - vocabulary.length;
    if (needed > 0) onChange([...vocabulary, ...Array.from({ length: needed }, emptyVocabRow)]);
  };
  const applyBulk = () => {
    const parsed = parseVocabulary(bulkText);
    if (parsed.length === 0) return;
    const filled = vocabulary.filter((v) => v.english?.trim() || v.mongolian?.trim());
    onChange([...filled, ...parsed]);
    setBulkText("");
    setBulkOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Зорилго: <strong>20 шинэ үг</strong>. Pronunciation заавал биш.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={fill20}>20 болгох</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(!bulkOpen)}>{bulkOpen ? "Хаах" : "Бөөнөөр оруулах"}</Button>
          <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="w-3 h-3 mr-1" />Мөр нэмэх</Button>
        </div>
      </div>
      {bulkOpen && (
        <div className="space-y-2 rounded-md border p-3 bg-muted/30">
          <p className="text-xs">Мөр бүр: <code>English | pronunciation | Mongolian | example</code></p>
          <Textarea className="min-h-32 font-mono text-xs" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="hello | həˈloʊ | сайн уу | Hello, how are you?" />
          <div className="flex justify-end"><Button type="button" size="sm" onClick={applyBulk}>Нэмэх</Button></div>
        </div>
      )}
      <div className="rounded-md border max-h-[55vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs sticky top-0">
            <tr>
              <th className="w-8 p-2">#</th>
              <th className="p-2 text-left">English</th>
              <th className="p-2 text-left">Pronunciation</th>
              <th className="p-2 text-left">Mongolian</th>
              <th className="p-2 text-left">Example</th>
              <th className="w-10 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {vocabulary.map((v, i) => (
              <tr key={i} className="border-t">
                <td className="p-1 text-center text-xs text-muted-foreground">{i + 1}</td>
                <td className="p-1"><Input className="h-8 text-sm" value={v.english || ""} onChange={(e) => update(i, "english", e.target.value)} /></td>
                <td className="p-1"><Input className="h-8 text-sm" value={v.pronunciation || ""} onChange={(e) => update(i, "pronunciation", e.target.value)} /></td>
                <td className="p-1"><Input className="h-8 text-sm" value={v.mongolian || ""} onChange={(e) => update(i, "mongolian", e.target.value)} /></td>
                <td className="p-1"><Input className="h-8 text-sm" value={v.example || ""} onChange={(e) => update(i, "example", e.target.value)} /></td>
                <td className="p-1 text-center"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button></td>
              </tr>
            ))}
            {vocabulary.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-4">Үг алга. "20 болгох" дарна уу.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuizEditor({ quiz, onChange }: { quiz: any[]; onChange: (q: any[]) => void }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const update = (idx: number, key: string, val: any) => {
    const next = [...quiz];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const updateOption = (qi: number, oi: number, val: string) => {
    const next = [...quiz];
    const opts = [...(next[qi].options || ["", "", ""])];
    opts[oi] = val;
    next[qi] = { ...next[qi], options: opts };
    onChange(next);
  };
  const addOption = (qi: number) => {
    const next = [...quiz];
    next[qi] = { ...next[qi], options: [...(next[qi].options || []), ""] };
    onChange(next);
  };
  const removeOption = (qi: number, oi: number) => {
    const next = [...quiz];
    const oldOpts = next[qi].options || [];
    const removed = oldOpts[oi];
    const opts = oldOpts.filter((_: string, i: number) => i !== oi);
    const correctAnswer = next[qi].correctAnswer === removed ? "" : next[qi].correctAnswer;
    next[qi] = { ...next[qi], options: opts, correctAnswer };
    onChange(next);
  };
  const remove = (idx: number) => onChange(quiz.filter((_, i) => i !== idx));
  const add = (n = 1) => onChange([...quiz, ...Array.from({ length: n }, (_, i) => emptyQuizRow(quiz.length + i))]);
  const applyBulk = () => {
    const parsed = parseQuiz(bulkText);
    if (parsed.length === 0) return;
    const filled = quiz.filter((q) => q.promptEn?.trim() || q.promptMn?.trim());
    onChange([...filled, ...parsed]);
    setBulkText("");
    setBulkOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Тэнцэх оноо: <strong>70%</strong>. Сонголт бүрт зөв хариултаа сонго.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => add(5)}>+5 асуулт</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(!bulkOpen)}>{bulkOpen ? "Хаах" : "Бөөнөөр оруулах"}</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => add(1)}><Plus className="w-3 h-3 mr-1" />Нэмэх</Button>
        </div>
      </div>
      {bulkOpen && (
        <div className="space-y-2 rounded-md border p-3 bg-muted/30">
          <p className="text-xs">Мөр бүр: <code>EN | MN | сонголт1;сонголт2;сонголт3 | зөв хариулт</code></p>
          <Textarea className="min-h-32 font-mono text-xs" value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="What is 'hello' in Mongolian? | 'hello'-г монголоор юу гэх вэ? | сайн уу;баяртай;баярлалаа | сайн уу" />
          <div className="flex justify-end"><Button type="button" size="sm" onClick={applyBulk}>Нэмэх</Button></div>
        </div>
      )}
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {quiz.map((q, qi) => (
          <div key={qi} className="rounded-md border p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Асуулт #{qi + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(qi)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-sm" placeholder="Question (EN)" value={q.promptEn || ""} onChange={(e) => update(qi, "promptEn", e.target.value)} />
              <Input className="h-8 text-sm" placeholder="Асуулт (MN)" value={q.promptMn || ""} onChange={(e) => update(qi, "promptMn", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              {(q.options || []).map((opt: string, oi: number) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === opt && opt !== ""} onChange={() => update(qi, "correctAnswer", opt)} title="Зөв хариулт" />
                  <Input className="h-8 text-sm" placeholder={`Сонголт ${oi + 1}`} value={opt} onChange={(e) => {
                    const wasCorrect = q.correctAnswer === opt;
                    updateOption(qi, oi, e.target.value);
                    if (wasCorrect) update(qi, "correctAnswer", e.target.value);
                  }} />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeOption(qi, oi)} disabled={(q.options || []).length <= 2}><XCircle className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(qi)}><Plus className="w-3 h-3 mr-1" />Сонголт</Button>
            </div>
            {!q.correctAnswer && <p className="text-xs text-amber-600">Зөв хариулт сонго.</p>}
          </div>
        ))}
        {quiz.length === 0 && <div className="text-center text-muted-foreground p-4 border rounded-md">Асуулт алга. "+5 асуулт" дарна уу.</div>}
      </div>
    </div>
  );
}

function LinesEditor({ label, items, onChange, placeholder, rows = 4 }: { label?: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <Textarea
        rows={rows}
        className="text-sm"
        placeholder={placeholder}
        value={(items || []).join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
      <p className="text-[10px] text-muted-foreground">Мөр тус бүр = нэг зүйл</p>
    </div>
  );
}

function RowsEditor<T extends Record<string, string>>({
  label, items, onChange, columns, blank,
}: {
  label?: string;
  items: T[];
  onChange: (v: T[]) => void;
  columns: { key: keyof T & string; header: string; placeholder?: string; width?: string }[];
  blank: () => T;
}) {
  const update = (idx: number, key: keyof T & string, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: val } as T;
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...(items || []), blank()]);

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {columns.map((c) => <th key={c.key} className="p-1.5 text-left font-medium" style={c.width ? { width: c.width } : undefined}>{c.header}</th>)}
              <th className="w-8 p-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((row, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="p-1">
                    <Input className="h-7 text-xs" placeholder={c.placeholder} value={(row as any)[c.key] ?? ""} onChange={(e) => update(i, c.key, e.target.value)} />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button>
                </td>
              </tr>
            ))}
            {(items || []).length === 0 && <tr><td colSpan={columns.length + 1} className="text-center text-muted-foreground p-2">Хоосон</td></tr>}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="w-3 h-3 mr-1" />Мөр нэмэх</Button>
    </div>
  );
}

function GrammarTableEditor({ items, onChange }: { items: any[]; onChange: (v: any[]) => void }) {
  const externalText = JSON.stringify(items || [], null, 2);
  const [text, setText] = useState(externalText);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(items || [])) {
        setText(externalText);
        setError(null);
      }
    } catch {
      // text is mid-edit and invalid; only sync when items genuinely differ from a valid representation
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalText]);
  const apply = (v: string) => {
    setText(v);
    try {
      const parsed = JSON.parse(v);
      if (!Array.isArray(parsed)) throw new Error("Массив байх ёстой");
      setError(null);
      onChange(parsed);
    } catch (e: any) {
      setError(e?.message ?? "JSON алдаатай");
    }
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs">Дүрмийн хүснэгт (JSON массив)</Label>
      <Textarea rows={6} className="text-xs font-mono" value={text} onChange={(e) => apply(e.target.value)} placeholder='[{"Subject":"I","Verb":"am"}]' />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground">Тус бүр row = объект (баганын нэр + утга). Жишээ: {`{"Subject":"I","Verb":"am","Example":"I am Bat."}`}</p>
    </div>
  );
}

function LessonContentEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const v = value || emptyLessonContent;
  const p1 = v.page1 || {};
  const p2 = v.page2 || {};
  const p3 = v.page3 || {};
  const setP1 = (patch: any) => onChange({ ...v, page1: { ...p1, ...patch } });
  const setP2 = (patch: any) => onChange({ ...v, page2: { ...p2, ...patch } });
  const setP3 = (patch: any) => onChange({ ...v, page3: { ...p3, ...patch } });

  return (
    <Tabs defaultValue="p1">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="p1">Хуудас 1 — Дүрэм</TabsTrigger>
        <TabsTrigger value="p2">Хуудас 2 — Унших + Ярих</TabsTrigger>
        <TabsTrigger value="p3">Хуудас 3 — Сонсох + Гэрийн даалгавар</TabsTrigger>
      </TabsList>

      <TabsContent value="p1" className="space-y-3 py-3">
        <div className="grid grid-cols-1 gap-2">
          <div><Label className="text-xs">Дүрмийн сэдэв</Label><Input className="h-8" value={p1.grammarTopic || ""} onChange={(e) => setP1({ grammarTopic: e.target.value })} /></div>
          <div><Label className="text-xs">Дүрмийн тайлбар</Label><Textarea rows={4} className="text-sm" value={p1.grammarExplanation || ""} onChange={(e) => setP1({ grammarExplanation: e.target.value })} /></div>
        </div>
        <GrammarTableEditor items={p1.grammarTable || []} onChange={(g) => setP1({ grammarTable: g })} />
        <div className="grid md:grid-cols-3 gap-3">
          <LinesEditor label="Quick Practice" items={p1.quickPractice || []} onChange={(x) => setP1({ quickPractice: x })} placeholder="I ___ a student." />
          <LinesEditor label="Common Mistakes" items={p1.commonMistakes || []} onChange={(x) => setP1({ commonMistakes: x })} placeholder="I is → I am" />
          <LinesEditor label="Answer Key" items={p1.answerKey || []} onChange={(x) => setP1({ answerKey: x })} placeholder="am" />
        </div>
      </TabsContent>

      <TabsContent value="p2" className="space-y-3 py-3">
        <div><Label className="text-xs">Унших текст</Label><Textarea rows={5} className="text-sm" value={p2.readingPassage || ""} onChange={(e) => setP2({ readingPassage: e.target.value })} /></div>
        <RowsEditor
          label="Гол хэллэг"
          items={p2.keyPhrases || []}
          onChange={(x) => setP2({ keyPhrases: x })}
          columns={[
            { key: "english", header: "English", placeholder: "Nice to meet you" },
            { key: "mongolian", header: "Mongolian", placeholder: "Танилцахад таатай байна" },
            { key: "note", header: "Note", placeholder: "Use when meeting someone new" },
          ]}
          blank={() => ({ english: "", mongolian: "", note: "" })}
        />
        <LinesEditor label="Speaking Questions" items={p2.speakingQuestions || []} onChange={(x) => setP2({ speakingQuestions: x })} placeholder="What is your name?" />
        <RowsEditor
          label="Role Play"
          items={p2.rolePlay || []}
          onChange={(x) => setP2({ rolePlay: x })}
          columns={[
            { key: "speaker", header: "Хэн", placeholder: "A", width: "60px" },
            { key: "text", header: "Юу хэлэх", placeholder: "Hi, I'm Bat." },
          ]}
          blank={() => ({ speaker: "A", text: "" })}
        />
        <div><Label className="text-xs">Speaking Tip</Label><Input className="h-8" value={p2.speakingTip || ""} onChange={(e) => setP2({ speakingTip: e.target.value })} /></div>
      </TabsContent>

      <TabsContent value="p3" className="space-y-3 py-3">
        <div><Label className="text-xs">Сонсох текст (TTS-д хэрэглэгдэнэ)</Label><Textarea rows={5} className="text-sm" value={p3.listeningScript || ""} onChange={(e) => setP3({ listeningScript: e.target.value })} /></div>
        <RowsEditor
          label="Сонсох асуултууд"
          items={p3.listeningQuestions || []}
          onChange={(x) => setP3({ listeningQuestions: x })}
          columns={[
            { key: "question", header: "Question", placeholder: "What is her name?" },
            { key: "answer", header: "Answer", placeholder: "Sara" },
          ]}
          blank={() => ({ question: "", answer: "" })}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <LinesEditor label="Grammar Practice" items={p3.grammarPractice || []} onChange={(x) => setP3({ grammarPractice: x })} placeholder="He ___ a doctor." />
          <RowsEditor
            label="Matching Exercise"
            items={p3.matchingExercise || []}
            onChange={(x) => setP3({ matchingExercise: x })}
            columns={[
              { key: "left", header: "Зүүн", placeholder: "Hello" },
              { key: "right", header: "Баруун", placeholder: "Сайн уу" },
            ]}
            blank={() => ({ left: "", right: "" })}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <LinesEditor label="Homework" items={p3.homework || []} onChange={(x) => setP3({ homework: x })} placeholder="Write 5 sentences..." />
          <LinesEditor label="Answer Key" items={p3.answerKey || []} onChange={(x) => setP3({ answerKey: x })} placeholder="is" />
          <LinesEditor label="Lesson Complete (товчоо)" items={p3.completionSummary || []} onChange={(x) => setP3({ completionSummary: x })} placeholder="Learned 20 new words" />
        </div>
        <div><Label className="text-xs">Маргаашийн хичээлийн товч</Label><Input className="h-8" value={p3.nextLessonPreview || ""} onChange={(e) => setP3({ nextLessonPreview: e.target.value })} /></div>
      </TabsContent>
    </Tabs>
  );
}

function LessonJsonImportDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (b: boolean) => void; onApply: (data: any) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || !parsed) throw new Error("Объект байх ёстой");
      onApply(parsed);
      toast({ title: "JSON ачаалагдлаа", description: "Талбарууд бөглөгдсөн. Хадгал даран бат болгоно уу." });
      setText("");
      setError(null);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "JSON алдаатай");
    }
  };

  const copyTemplate = async () => {
    const tpl = JSON.stringify(lessonJsonTemplate, null, 2);
    try {
      await navigator.clipboard.writeText(tpl);
      toast({ title: "Загвар хуулагдлаа", description: "Засаад буцааж энд буулгана уу." });
    } catch {
      setText(tpl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Бүх хичээлийг JSON-оор ачаалах</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-xs text-muted-foreground">
            Доорх форматтай бүхэл хичээлийн JSON буулгана уу. Талбар нь заавал бүгд байх албагүй — байсан талбарууд л формыг шинэчилнэ.
            Vocabulary-ийн pronunciation болон quiz-ийн options/correctAnswer заавал шалгагдана.
          </p>
          <div className="flex justify-between gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyTemplate}><Copy className="w-3 h-3 mr-1" />Загвар хуулах</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setText(JSON.stringify(lessonJsonTemplate, null, 2))}>Загвараар бөглөх</Button>
          </div>
          <Textarea
            className="font-mono text-xs min-h-[55vh]"
            placeholder='{"titleEn":"...","titleMn":"...","vocabulary":[...],"quiz":[...],"lessonContent":{"page1":{...},"page2":{...},"page3":{...}}}'
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
          <Button onClick={handleApply} disabled={!text.trim()}>Ачаалах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PlacementBand = "a1" | "a2" | "b1";
const BAND_LABEL: Record<PlacementBand, string> = { a1: "A1 — Эхлэгч", a2: "A2 — Бага", b1: "B1 — Дунд" };

function PlacementPanel() {
  const { data: questions = [], isLoading } = useAdminListPlacementQuestions();
  const create = useAdminCreatePlacementQuestion();
  const update = useAdminUpdatePlacementQuestion();
  const del = useAdminDeletePlacementQuestion();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<AdminPlacementQuestion | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListPlacementQuestionsQueryKey() });

  const handleDelete = async (q: AdminPlacementQuestion) => {
    if (!confirm(`Асуулт #${q.position}-г устгах уу?`)) return;
    try {
      await del.mutateAsync({ questionId: q.id });
      toast({ title: "Устгасан" });
      await refresh();
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message, variant: "destructive" });
    }
  };

  const counts = questions.reduce(
    (acc, q) => { acc[q.band as PlacementBand] = (acc[q.band as PlacementBand] || 0) + 1; return acc; },
    {} as Record<PlacementBand, number>,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Түвшин тогтоох тестийн асуултууд</CardTitle>
          <CardDescription>
            Нийт {questions.length} асуулт · A1: {counts.a1 || 0} · A2: {counts.a2 || 0} · B1: {counts.b1 || 0}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Шинэ асуулт</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Одоогоор асуулт алга.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-24">Түвшин</TableHead>
                <TableHead>Асуулт</TableHead>
                <TableHead>Зөв хариулт</TableHead>
                <TableHead className="w-24 text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.position}</TableCell>
                  <TableCell><Badge variant="outline">{BAND_LABEL[q.band as PlacementBand] ?? q.band}</Badge></TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm font-medium truncate">{q.promptEn}</div>
                    {q.promptMn && <div className="text-xs text-muted-foreground truncate">{q.promptMn}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{q.correctAnswer}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(q)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(q)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {(creating || editing) && (
        <PlacementQuestionDialog
          initial={editing ?? undefined}
          defaultPosition={questions.length + 1}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={async (values) => {
            try {
              if (editing) {
                await update.mutateAsync({ questionId: editing.id, data: values });
                toast({ title: "Шинэчилсэн" });
              } else {
                await create.mutateAsync({ data: values });
                toast({ title: "Нэмсэн" });
              }
              setCreating(false);
              setEditing(null);
              await refresh();
            } catch (err: any) {
              toast({ title: "Алдаа", description: err?.message, variant: "destructive" });
            }
          }}
        />
      )}
    </Card>
  );
}

function PlacementQuestionDialog({
  initial,
  defaultPosition,
  onClose,
  onSubmit,
}: {
  initial?: AdminPlacementQuestion;
  defaultPosition: number;
  onClose: () => void;
  onSubmit: (values: { position: number; band: PlacementBand; promptEn: string; promptMn: string; options: string[]; correctAnswer: string }) => Promise<void>;
}) {
  const [position, setPosition] = useState(initial?.position ?? defaultPosition);
  const [band, setBand] = useState<PlacementBand>((initial?.band as PlacementBand) ?? "a1");
  const [promptEn, setPromptEn] = useState(initial?.promptEn ?? "");
  const [promptMn, setPromptMn] = useState(initial?.promptMn ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer ?? "");
  const [saving, setSaving] = useState(false);

  const updateOption = (i: number, value: string) => {
    const next = [...options];
    next[i] = value;
    setOptions(next);
  };
  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));

  const submit = async () => {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) { alert("Хамгийн багадаа 2 сонголт оруулна уу."); return; }
    if (!cleanOptions.includes(correctAnswer.trim())) { alert("Зөв хариулт нь сонголтуудын аль нэг байх ёстой."); return; }
    if (!promptEn.trim()) { alert("Асуултын текст шаардлагатай."); return; }
    setSaving(true);
    try {
      await onSubmit({
        position,
        band,
        promptEn: promptEn.trim(),
        promptMn: promptMn.trim(),
        options: cleanOptions,
        correctAnswer: correctAnswer.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `Асуулт #${initial.position} засах` : "Шинэ асуулт"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дугаар (position)</Label>
              <Input type="number" min={1} value={position} onChange={(e) => setPosition(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Түвшин (band)</Label>
              <Select value={band} onValueChange={(v) => setBand(v as PlacementBand)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a1">A1 — Эхлэгч</SelectItem>
                  <SelectItem value="a2">A2 — Бага</SelectItem>
                  <SelectItem value="b1">B1 — Дунд</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Асуулт (Англи)</Label>
            <Textarea rows={2} value={promptEn} onChange={(e) => setPromptEn(e.target.value)} />
          </div>
          <div>
            <Label>Тайлбар (Монгол, заавал биш)</Label>
            <Textarea rows={2} value={promptMn} onChange={(e) => setPromptMn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Сонголтууд</Label>
              <Button type="button" size="sm" variant="outline" onClick={addOption}><Plus className="h-3 w-3 mr-1" />Нэмэх</Button>
            </div>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={opt} placeholder={`Сонголт ${i + 1}`} onChange={(e) => updateOption(i, e.target.value)} />
                {options.length > 2 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
          <div>
            <Label>Зөв хариулт</Label>
            <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
              <SelectTrigger><SelectValue placeholder="Сонгоно уу" /></SelectTrigger>
              <SelectContent>
                {options.map((o, i) => o.trim() && (
                  <SelectItem key={i} value={o.trim()}>{o.trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Болих</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Хадгалж байна..." : "Хадгалах"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinalTestsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Түвшний шалгалтууд</CardTitle>
        <CardDescription>Level 1 / 2 / 3 төгсгөлийн шалгалтуудын төлөв.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {[1, 2, 3].map((lv) => (
          <div key={lv} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-semibold">Level {lv} шалгалт</p>
              <p className="text-xs text-muted-foreground">Зам: <code>/final-tests/{lv}</code> · Тэнцэх оноо: 80%</p>
            </div>
            <Badge variant="secondary">Идэвхтэй</Badge>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">Шалгалтын асуултуудыг одоогоор серверийн seed-ээр удирдаж байна. Сурагч тухайн түвшний багц авмагц шалгалт автоматаар нээгдэнэ.</p>
      </CardContent>
    </Card>
  );
}
