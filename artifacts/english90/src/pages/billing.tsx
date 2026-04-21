import { useCreatePaymentRequest, useListMyPaymentRequests, type PaymentRequest } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Copy, Landmark, Receipt, ShieldCheck, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BANK = {
  name: "Хаан Банк",
  iban: "05 0005 00 5224574340",
  account: "5224574340",
  holder: "Давхарбаяр Алтангэрэл",
};

type Product = { id: string; titleMn: string; titleEn: string; amount: number; highlight?: boolean; description: string };
const PRODUCTS: Product[] = [
  { id: "level:1", titleMn: "Level 1 багц (30 хичээл)", titleEn: "Level 1 pack", amount: 29000, highlight: true, description: "Эхлэгчдэд зориулсан 30 хоногийн бүтэн контент" },
  { id: "level:2", titleMn: "Level 2 багц (30 хичээл)", titleEn: "Level 2 pack", amount: 29000, description: "Дунд түвшний 30 хоногийн бүтэн контент" },
  { id: "level:3", titleMn: "Level 3 багц (30 хичээл)", titleEn: "Level 3 pack", amount: 29000, description: "Дээд түвшний 30 хоногийн бүтэн контент" },
  { id: "course:full", titleMn: "Бүтэн 90 хоногийн курс", titleEn: "Full 90-day course", amount: 79000, description: "Бүх 3 түвшин + бүх шалгалт" },
];

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

function StatusBadge({ status }: { status: PaymentRequest["status"] }) {
  if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Баталгаажсан</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Татгалзсан</Badge>;
  return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Хүлээгдэж байна</Badge>;
}

export default function Billing() {
  const { toast } = useToast();
  const { data: requests, isLoading, refetch } = useListMyPaymentRequests();
  const createRequest = useCreatePaymentRequest();
  const [productId, setProductId] = useState<string>("level:1");
  const [transactionRef, setTransactionRef] = useState("");
  const [payerName, setPayerName] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [note, setNote] = useState("");

  const selectedProduct = useMemo(() => PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0], [productId]);
  const hasApproved = (requests ?? []).some((r) => r.status === "approved");

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val).then(() => toast({ title: `${label} хууллаа`, description: val }));
  };

  const submit = async () => {
    if (!transactionRef.trim() || !payerName.trim()) {
      toast({ title: "Дутуу мэдээлэл", description: "Гүйлгээний дугаар болон төлөгчийн нэр шаардлагатай.", variant: "destructive" });
      return;
    }
    try {
      await createRequest.mutateAsync({
        data: {
          productId,
          transactionRef: transactionRef.trim(),
          payerName: payerName.trim(),
          screenshotUrl: screenshotUrl.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      toast({ title: "Хүсэлт илгээгдлээ", description: "Админ баталгаажуулсны дараа эрх автоматаар нээгдэнэ." });
      setTransactionRef("");
      setPayerName("");
      setScreenshotUrl("");
      setNote("");
      await refetch();
    } catch (err: any) {
      toast({ title: "Алдаа", description: err?.message || "Хүсэлт илгээж чадсангүй.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="max-w-5xl mx-auto space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Багц авах</h1>
        <p className="text-muted-foreground mt-2">Хаан банк руу шилжүүлэг хийгээд гүйлгээний мэдээллээ илгээнэ үү. Админ баталгаажуулмагц контент автоматаар нээгдэнэ.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { n: "1", t: "Багц сонгох", d: "Танд хэрэгтэй багцаа сонгож, үнийг анхаарна." },
          { n: "2", t: "Хаан банкаар шилжүүлэх", d: "Дансанд яг үнэн дүнг шилжүүлж, гүйлгээний утга дээр өөрийн email бичнэ." },
          { n: "3", t: "Хүсэлт илгээх", d: "Гүйлгээний дугаар, төлөгчийн нэрийг доор бөглөж илгээнэ. 24 цагт багтаан баталгаажуулна." },
        ].map((s) => (
          <div key={s.n} className="rounded-xl border bg-card p-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-2">{s.n}</div>
            <p className="font-semibold">{s.t}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      {hasApproved && (
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span>Танд баталгаажсан төлбөр байна. Хичээлүүд нээлттэй.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> Шилжүүлэх банк</CardTitle>
            <CardDescription>Дараах дансанд яг хэрэгтэй дүнг шилжүүлж, гүйлгээний дугаараа доор оруулна уу.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Банк</span><span className="font-semibold">{BANK.name}</span></div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">IBAN</span>
              <button className="font-mono font-semibold flex items-center gap-2 hover:text-primary" onClick={() => copy(BANK.iban, "IBAN")}>{BANK.iban}<Copy className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Дансны дугаар</span>
              <button className="font-mono font-semibold flex items-center gap-2 hover:text-primary" onClick={() => copy(BANK.account, "Дансны дугаар")}>{BANK.account}<Copy className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Хүлээн авагч</span><span className="font-semibold">{BANK.holder}</span></div>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              Гүйлгээний утга дээр өөрийн email хаягийг бичвэл шалгахад хялбар. Шилжүүлгийн дараа гарсан баримтаа зураг хэлбэрээр (хүсвэл) хадгалж URL-аа доор оруулна уу.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Төлбөрийн хүсэлт илгээх</CardTitle>
            <CardDescription>Шилжүүлэг хийсний дараа доорх формыг бөглөнө үү.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Багц</Label>
              <div className="grid gap-2">
                {PRODUCTS.map((p) => (
                  <label key={p.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${productId === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                    <input type="radio" name="product" value={p.id} checked={productId === p.id} onChange={() => setProductId(p.id)} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2"><span className="font-medium">{p.titleMn}</span><span className="font-bold">{formatMnt(p.amount)}</span></div>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Төлөх дүн</span>
              <span className="font-bold text-lg">{formatMnt(selectedProduct.amount)}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">Гүйлгээний дугаар *</Label>
              <Input id="ref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="ж: 2026042100123456" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payer">Төлөгчийн нэр *</Label>
              <Input id="payer" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Гүйлгээ хийсэн хүний бүтэн нэр" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss">Баримтын зургийн URL (заавал биш)</Label>
              <Input id="ss" value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Нэмэлт тайлбар</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Сонголт" rows={2} />
            </div>
            <Button className="w-full" onClick={submit} disabled={createRequest.isPending}>
              {createRequest.isPending ? "Илгээж байна..." : "Төлбөрийн хүсэлт илгээх"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Миний хүсэлтүүд</CardTitle>
          <CardDescription>Илгээсэн хүсэлтийн төлөв.</CardDescription>
        </CardHeader>
        <CardContent>
          {(requests ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Одоогоор хүсэлт байхгүй.</p>
          ) : (
            <div className="space-y-3">
              {(requests ?? []).map((r) => (
                <div key={r.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">{r.productName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("mn-MN")}</p>
                    </div>
                    <div className="flex items-center gap-2"><span className="font-bold">{formatMnt(r.amount)}</span><StatusBadge status={r.status} /></div>
                  </div>
                  <div className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-1">
                    <span>Гүйлгээний дугаар: <span className="font-mono text-foreground">{r.transactionRef ?? "-"}</span></span>
                    <span>Төлөгч: <span className="text-foreground">{r.payerName ?? "-"}</span></span>
                  </div>
                  {r.adminNote && <p className="text-sm rounded bg-muted/50 p-2"><span className="text-muted-foreground">Админы тайлбар: </span>{r.adminNote}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
