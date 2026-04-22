import { useEffect, useMemo, useState } from "react";
import { useGetContactSettings, useAdminUpdateContactSettings, useGetMe, getGetContactSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  Mail,
  MessageCircle,
  Facebook,
  Copy,
  CreditCard,
  HelpCircle,
  Clock,
  Pencil,
  Save,
  X,
  User,
  Building2,
  StickyNote,
} from "lucide-react";

type ContactForm = {
  adminName: string;
  phone: string;
  email: string;
  messenger: string;
  facebook: string;
  workingHours: string;
  bankName: string;
  bankIban: string;
  bankHolder: string;
  notes: string;
};

const FALLBACK: ContactForm = {
  adminName: "Давхарбаяр Алтангэрэл",
  phone: "+976 99999999",
  email: "english90.mn@gmail.com",
  messenger: "m.me/english90",
  facebook: "facebook.com/english90",
  workingHours: "Даваа–Баасан · 09:00–18:00",
  bankName: "Хаан Банк",
  bankIban: "05 0005 00 5224574340",
  bankHolder: "Давхарбаяр Алтангэрэл",
  notes: "Шилжүүлгийн утга дээр өөрийн нэр, утсыг бичээрэй.",
};

export default function Contact() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetContactSettings();
  const update = useAdminUpdateContactSettings();

  const isAdmin = me?.role === "admin";
  const contact = useMemo<ContactForm>(() => ({ ...FALLBACK, ...(data ?? {}) } as ContactForm), [data]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactForm>(contact);

  useEffect(() => {
    if (!editing) setForm(contact);
  }, [contact, editing]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Хуулагдлаа", description: `${label} clipboard руу хуулагдлаа.` }),
      () => toast({ title: "Алдаа", description: "Хуулж чадсангүй", variant: "destructive" }),
    );
  };

  const save = async () => {
    try {
      await update.mutateAsync({ data: form });
      await qc.invalidateQueries({ queryKey: getGetContactSettingsQueryKey() });
      toast({ title: "Хадгаллаа", description: "Холбоо барих мэдээллийг шинэчиллээ." });
      setEditing(false);
    } catch (e) {
      toast({ title: "Алдаа", description: (e as Error).message || "Хадгалж чадсангүй", variant: "destructive" });
    }
  };

  const reasons = [
    { i: CreditCard, t: "Төлбөр баталгаажихгүй байна", d: "Шилжүүлэг хийсэн боловч хичээл нээгдэхгүй бол." },
    { i: HelpCircle, t: "Хичээлийн тухай асуулт", d: "Дүрэм, дасгал, шалгалттай холбоотой бүх асуулт." },
    { i: Clock, t: "Бусад хүсэлт", d: "Санал, гомдол, шинэ боломжийн хүсэлт." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Админтай холбогдох · Contact admin</h1>
          <p className="text-muted-foreground mt-2">
            Аливаа асуудал, асуултаа дараах сувгуудаар бидэнтэй холбогдоорой. Бид аль болох хурдан хариулна.
          </p>
        </div>
        {isAdmin && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
            <Pencil className="w-4 h-4" /> Засах
          </Button>
        )}
        {isAdmin && editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(contact); }} className="gap-2">
              <X className="w-4 h-4" /> Болих
            </Button>
            <Button size="sm" onClick={save} disabled={update.isPending} className="gap-2">
              <Save className="w-4 h-4" /> {update.isPending ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reasons.map(({ i: Icon, t, d }) => (
          <Card key={t} className="border-primary/10">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-sm">{t}</p>
              <p className="text-xs text-muted-foreground mt-1">{d}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing ? (
        <Card className="border-primary/30">
          <div className="h-1 rounded-t-md bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />
          <CardHeader>
            <CardTitle>Холбоо барих мэдээлэл (засварлах горим)</CardTitle>
            <CardDescription>Зөвхөн админ. Хадгалсны дараа бүх хэрэглэгчид харагдана.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Админ нэр" v={form.adminName} onChange={(v) => setForm({ ...form, adminName: v })} />
            <Field label="Ажлын цаг" v={form.workingHours} onChange={(v) => setForm({ ...form, workingHours: v })} />
            <Field label="Утас" v={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Имэйл" v={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Messenger" v={form.messenger} onChange={(v) => setForm({ ...form, messenger: v })} />
            <Field label="Facebook" v={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} />
            <Field label="Банкны нэр" v={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
            <Field label="Дансны дугаар" v={form.bankIban} onChange={(v) => setForm({ ...form, bankIban: v })} />
            <Field label="Дансны нэр" v={form.bankHolder} onChange={(v) => setForm({ ...form, bankHolder: v })} />
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Тэмдэглэл</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/20">
            <div className="h-1 rounded-t-md bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />
            <CardHeader>
              <CardTitle>Холбоо барих сувгууд</CardTitle>
              <CardDescription>
                {contact.adminName} · {contact.workingHours}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactRow icon={User} label="Админ · Admin" value={contact.adminName} onCopy={() => copy(contact.adminName, "Нэр")} accent="text-violet-600" bg="bg-violet-500/10" />
              <ContactRow icon={Phone} label="Утас · Phone" value={contact.phone} onCopy={() => copy(contact.phone, "Утас")} accent="text-emerald-600" bg="bg-emerald-500/10" />
              <ContactRow icon={Mail} label="Имэйл · Email" value={contact.email} onCopy={() => copy(contact.email, "Имэйл")} accent="text-primary" bg="bg-primary/10" />
              <ContactRow icon={MessageCircle} label="Messenger" value={contact.messenger} onCopy={() => copy(contact.messenger, "Messenger")} accent="text-blue-600" bg="bg-blue-500/10" />
              <ContactRow icon={Facebook} label="Facebook" value={contact.facebook} onCopy={() => copy(contact.facebook, "Facebook")} accent="text-blue-700" bg="bg-blue-500/10" />
              <ContactRow icon={Clock} label="Ажлын цаг" value={contact.workingHours} onCopy={() => copy(contact.workingHours, "Ажлын цаг")} accent="text-amber-600" bg="bg-amber-500/10" />
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Төлбөрийн дансны мэдээлэл
              </CardTitle>
              <CardDescription className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{contact.notes}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
              <KV icon={Building2} label="Банк" value={contact.bankName} onCopy={() => copy(contact.bankName, "Банк")} />
              <KV icon={CreditCard} label="Дансны дугаар" value={contact.bankIban} onCopy={() => copy(contact.bankIban.replace(/\s/g, ""), "Дансны дугаар")} />
              <KV icon={User} label="Дансны нэр" value={contact.bankHolder} onCopy={() => copy(contact.bankHolder, "Дансны нэр")} />
            </CardContent>
          </Card>
        </>
      )}

      {isLoading && <p className="text-xs text-muted-foreground text-center">Уншиж байна...</p>}
    </div>
  );
}

function Field({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={v} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function KV({ icon: Icon, label, value, onCopy }: { icon: any; label: string; value: string; onCopy: () => void }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="font-semibold text-sm break-all select-all">{value}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy} aria-label="Хуулах">
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, onCopy, accent, bg }: { icon: any; label: string; value: string; onCopy: () => void; accent: string; bg: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4 hover:border-primary/40 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-lg ${bg} ${accent} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm break-all select-all">{value}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy} className="gap-2 shrink-0">
        <Copy className="w-3.5 h-3.5" /> Хуулах
      </Button>
    </div>
  );
}
