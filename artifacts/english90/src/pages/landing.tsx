import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Brain, CheckCircle2, ClipboardCheck, GraduationCap, Headphones, MessageSquare, Sparkles, Star, Target, Trophy } from "lucide-react";

const PRICING = [
  { id: "lesson:1", title: "Нэг хичээл", price: "4,900₮", desc: "Тухайн нэг хичээлийг туршиж үзэх", features: ["1 өдрийн бүтэн контент", "20 шинэ үг", "Сорил + хариулт"], cta: "Туршиж үзэх", href: "/sign-up" },
  { id: "level:1", title: "Level 1 багц", price: "29,000₮", desc: "Эхлэгчдэд зориулсан 30 хоног", features: ["30 хоногийн бүтэн контент", "Audio listening", "Level 1 шалгалт"], cta: "Level 1 авах", href: "/sign-up", highlight: true },
  { id: "course:full", title: "Бүтэн 90 хоног", price: "79,000₮", desc: "Бүх 3 түвшин + бүх шалгалт", features: ["90 хоногийн бүх контент", "3 түвшний шалгалт", "Хязгааргүй давталт"], cta: "Бүгдийг авах", href: "/sign-up" },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg">90</div>
          <span className="font-bold text-xl tracking-tight">English90</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#how" className="text-muted-foreground hover:text-foreground">Хэрхэн ажилладаг вэ</a>
          <a href="#level1" className="text-muted-foreground hover:text-foreground">Level 1 хөтөлбөр</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">Үнэ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">Нэвтрэх</Link>
          <Button asChild size="sm"><Link href="/sign-up">Бүртгүүлэх</Link></Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative py-20 md:py-28 px-4 md:px-8 overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/8 via-background to-amber-100/40 dark:to-amber-500/5" />
          <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl -z-10" />
          <div aria-hidden className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-primary/15 blur-3xl -z-10" />
          <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-medium">
                <Sparkles className="w-4 h-4" /> Шинэ Level 1 хөтөлбөр нээгдлээ
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                Англи хэлийг 90 хоногт{" "}
                <span className="text-primary">өөрийн болго.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">Өдөрт ердөө 60 минут. Цэгцтэй 3-түвшинт хөтөлбөр, Өдөр бүр 20 шинэ үг бүхий хичээл, дүрэм, audio listening, шалгалт.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <Link href="/sign-up">Үнэгүй бүртгүүлэх <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
                  <Link href="/sign-up">Түвшин тогтоох тест өгөх</Link>
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground justify-center lg:justify-start pt-2">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary" /> Үнэгүй демо хичээл</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary" /> Үнэгүй түвшин тогтоох тест</span>
              </div>
            </div>
            <div className="rounded-2xl border bg-card shadow-xl p-6 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">Жишээ хичээл — Day 1</p>
              <h3 className="text-xl font-bold">Greetings & Introductions</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[{ i: BookOpen, t: "60 мин" }, { i: Headphones, t: "Audio + TTS" }, { i: MessageSquare, t: "20 шинэ үг" }, { i: ClipboardCheck, t: "Сорил" }].map((x, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border bg-background p-3"><x.i className="w-4 h-4 text-primary" /> {x.t}</div>
                ))}
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
                <p className="font-semibold">Хэлсэн зүйл (Speaking)</p>
                <p>"Hello! My name is Bat. Nice to meet you."</p>
                <p className="text-muted-foreground">Сайн уу! Намайг Бат гэдэг. Танилцсандаа баяртай байна.</p>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30 border-y">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold mb-3">Яагаад English90 гэж?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Энэ бол зүгээр нэг хичээл биш, харин 90 хоногт Англиар ярих дадал бүтээх систем юм.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { i: Target, t: "Тодорхой зорилго", d: "Өдөр бүр юу хийх нь тодорхой. 90 хоногийн систем хөтөлбөр." },
                { i: Brain, t: "Ухаалаг давталт", d: "Сурсан мэдлэгээ байнга сэргээж, мартагдахаас сэргийлнэ." },
                { i: Trophy, t: "Баталгаатай үр дүн", d: "Түвшин бүрийг шалгалтаар баталгаажуулж дараагийн шатанд орно." },
              ].map(({ i: Icon, t, d }) => (
                <div key={t} className="bg-background p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4"><Icon className="h-6 w-6" /></div>
                  <h3 className="font-semibold text-lg mb-2">{t}</h3>
                  <p className="text-muted-foreground text-sm">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Хэрхэн ажилладаг вэ?</h2>
              <p className="text-muted-foreground">Хүн бүрд тохирсон 4 алхамтай явц.</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { n: "1", t: "Бүртгүүлэх", d: "Имэйлээр бүртгүүлж 1 минутад эхлэнэ." },
                { n: "2", t: "Түвшин тогтоох", d: "Үнэгүй тестээр өөрт тохирох түвшнээ олно." },
                { n: "3", t: "Багц авах", d: "Level 1 эсвэл бүтэн курсаа авна." },
                { n: "4", t: "Өдөр бүр 60 минут", d: "60 минутын хичээл + сорил + шалгалт." },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl border p-6 bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mb-3">{s.n}</div>
                  <h3 className="font-semibold mb-1">{s.t}</h3>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="level1" className="py-20 bg-muted/30 border-y px-4 md:px-8">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <GraduationCap className="w-4 h-4" /> Level 1 хөтөлбөр
              </div>
              <h2 className="text-3xl font-bold mb-3">Анхан шатанд зориулсан 30 хоног</h2>
              <p className="text-muted-foreground mb-6">Greeting-ээс эхлээд өөрийгөө бүрэн илэрхийлж сурах хүртэл — өдөр бүр шинэ үг, дүрэм, ярианы дасгал, listening-тэй.</p>
              <ul className="space-y-2 text-sm">
                {["30 өдрийн бүтэн контент (90 хуудас материал)", "Өдөр бүр 20 шинэ үг (нийт 600+ үг)", "Audio listening + TTS дуудлага", "Бүх грамматик дүрмийн дасгал", "Level 1 төгсгөлийн шалгалт", "Хэрвээ тэнцвэл Level 2 руу"].map((x) => (
                  <li key={x} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> {x}</li>
                ))}
              </ul>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[1, 7, 15, 23, 27, 30].map((d) => (
                <div key={d} className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Өдөр {d}</p>
                  <p className="font-semibold mt-1">{["Greetings & Intros", "Daily Routines", "Past Tense Stories", "Future Plans", "Travel & Directions", "Level 1 Final"][[1, 7, 15, 23, 27, 30].indexOf(d)]}</p>
                  <p className="text-xs text-muted-foreground mt-2">60 мин · 20 үг · Audio</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Үнийн санал</h2>
              <p className="text-muted-foreground">Хаан Банкны данс руу шилжүүлж, админ баталгаажуулмагц контент автоматаар нээгдэнэ.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {PRICING.map((p) => (
                <div key={p.id} className={`rounded-2xl border p-6 bg-card flex flex-col ${p.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}>
                  {p.highlight && <div className="inline-flex items-center gap-1 self-start text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-2"><Star className="w-3 h-3" /> Хамгийн алдартай</div>}
                  <h3 className="text-xl font-bold">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                  <p className="text-3xl font-bold mt-4">{p.price}</p>
                  <ul className="space-y-2 text-sm mt-5 mb-6 flex-1">
                    {p.features.map((f) => <li key={f} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> {f}</li>)}
                  </ul>
                  <Button asChild variant={p.highlight ? "default" : "outline"} className="w-full"><Link href={p.href}>{p.cta}</Link></Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-4 md:px-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">90 хоногийн дараах өөртэйгөө уулзахад бэлэн үү?</h2>
          <p className="text-muted-foreground mb-8">Эхний алхам бол үнэгүй шатлалын тест. Үүнийг хийгээд танд тохирох түвшнээс эхлээрэй.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="h-14 px-10 text-base"><Link href="/sign-up">Үнэгүй эхлэх</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-10 text-base"><Link href="/sign-in">Нэвтрэх</Link></Button>
          </div>
        </section>
      </main>
      <footer className="border-t py-8 px-4 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} English90. Бүх эрх хуулиар хамгаалагдсан.</p>
      </footer>
    </div>
  );
}
