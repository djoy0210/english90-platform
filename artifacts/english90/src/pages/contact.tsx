import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, Facebook, Copy, CreditCard, HelpCircle, Clock } from "lucide-react";

const CONTACT = {
  adminName: "Давхарбаяр Алтангэрэл",
  phone: "+976 99999999",
  email: "english90.mn@gmail.com",
  messenger: "https://m.me/english90",
  facebook: "https://facebook.com/english90",
  workingHours: "Даваа–Баасан · 09:00–18:00",
  bank: { name: "Хаан Банк", iban: "05 0005 00 5224574340", holder: "Давхарбаяр Алтангэрэл" },
};

export default function Contact() {
  const { toast } = useToast();
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Хуулагдлаа", description: `${label} clipboard руу хуулагдлаа.` }),
      () => toast({ title: "Алдаа", description: "Хуулж чадсангүй", variant: "destructive" }),
    );
  };

  const reasons = [
    { i: CreditCard, t: "Төлбөр баталгаажихгүй байна", d: "Шилжүүлэг хийсэн боловч хичээл нээгдэхгүй бол." },
    { i: HelpCircle, t: "Хичээлийн тухай асуулт", d: "Дүрэм, дасгал, шалгалттай холбоотой бүх асуулт." },
    { i: Clock, t: "Бусад хүсэлт", d: "Санал, гомдол, шинэ боломжийн хүсэлт." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Админтай холбогдох · Contact admin</h1>
        <p className="text-muted-foreground mt-2">
          Аливаа асуудал, асуултаа дараах сувгуудаар бидэнтэй холбогдоорой. Бид аль болох хурдан хариулна.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reasons.map(({ i: Icon, t, d }) => (
          <Card key={t} className="border-primary/10">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3"><Icon className="w-5 h-5" /></div>
              <p className="font-semibold text-sm">{t}</p>
              <p className="text-xs text-muted-foreground mt-1">{d}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="h-1 bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />
        <CardHeader>
          <CardTitle>Холбоо барих сувгууд</CardTitle>
          <CardDescription>{CONTACT.adminName} · {CONTACT.workingHours}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContactRow icon={Phone} label="Утас · Phone" value={CONTACT.phone} actions={[
            { label: "Хуулах", onClick: () => copy(CONTACT.phone, "Утасны дугаар") },
            { label: "Залгах", asChild: true, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` },
          ]} accent="text-emerald-600" bg="bg-emerald-500/10" />

          <ContactRow icon={Mail} label="Имэйл · Email" value={CONTACT.email} actions={[
            { label: "Хуулах", onClick: () => copy(CONTACT.email, "Имэйл") },
            { label: "Илгээх", asChild: true, href: `mailto:${CONTACT.email}?subject=${encodeURIComponent("English90 — Хүсэлт")}` },
          ]} accent="text-primary" bg="bg-primary/10" />

          <ContactRow icon={MessageCircle} label="Messenger" value="" actions={[
            { label: "Нээх", asChild: true, href: CONTACT.messenger, external: true },
          ]} accent="text-blue-600" bg="bg-blue-500/10" />

          <ContactRow icon={Facebook} label="Facebook page" value="facebook.com/english90" actions={[
            { label: "Үзэх", asChild: true, href: CONTACT.facebook, external: true },
          ]} accent="text-blue-700" bg="bg-blue-500/10" />
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Төлбөрийн дансны мэдээлэл (сануулга)
          </CardTitle>
          <CardDescription>Шилжүүлэг хийгээд гүйлгээний утга дээр нэр + утсаа бичээрэй.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
          <KV label="Банк" value={CONTACT.bank.name} />
          <KV label="Дансны дугаар" value={CONTACT.bank.iban} copyable onCopy={() => copy(CONTACT.bank.iban.replace(/\s/g, ""), "Дансны дугаар")} />
          <KV label="Дансны нэр" value={CONTACT.bank.holder} />
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="font-semibold text-sm break-all">{value}</p>
        {copyable && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy} aria-label="Copy">
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface Action { label: string; onClick?: () => void; asChild?: boolean; href?: string; external?: boolean }
function ContactRow({ icon: Icon, label, value, actions, accent, bg }: { icon: any; label: string; value: string; actions: Action[]; accent: string; bg: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4 hover:border-primary/40 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-lg ${bg} ${accent} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-sm truncate">{value}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {actions.map((a, i) =>
          a.asChild && a.href ? (
            <Button key={i} asChild size="sm" variant={i === actions.length - 1 ? "default" : "outline"}>
              <a href={a.href} target={a.external ? "_blank" : undefined} rel={a.external ? "noopener noreferrer" : undefined}>{a.label}</a>
            </Button>
          ) : (
            <Button key={i} size="sm" variant="outline" onClick={a.onClick}>{a.label}</Button>
          ),
        )}
      </div>
    </div>
  );
}
