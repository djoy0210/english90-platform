import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Target, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 px-4 md:px-8 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg">
            90
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">English90</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Нэвтрэх (Sign In)
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">Эхлэх</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 md:px-8 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Шинэ элсэлт эхэллээ
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Англи хэлийг 90 хоногт <br className="hidden md:block" />
            <span className="text-primary">өөрийн болго.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Өдөрт ердөө 20 минут. Цэгцтэй хөтөлбөр, байнгийн сорил, бодит үр дүн.
            Монгол хүний сурах арга барилд тусгайлан зориулав.
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-base">
              <Link href="/sign-up">
                Хөтөлбөрт нэгдэх <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground sm:hidden">
              Эхний 3 өдөр үнэгүй
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/30 border-y">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Яагаад English90 гэж?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Бид зүгээр нэг хичээл биш, харин таныг үр дүнд хүргэх 90 хоногийн системт дадал бүтээх болно.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Тодорхой зорилго</h3>
                <p className="text-muted-foreground text-sm">
                  Өдөр бүр юу хийх нь тодорхой. 90 хоногийн турш таныг чиглүүлэх системт хөтөлбөр.
                </p>
              </div>
              <div className="bg-background p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-secondary/20 text-secondary-foreground rounded-xl flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Ухаалаг давталт</h3>
                <p className="text-muted-foreground text-sm">
                  Өмнөх өдрүүдийн мэдлэгийг байнга сануулж, мартагдахаас сэргийлэх шалгалтын систем.
                </p>
              </div>
              <div className="bg-background p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Баталгаатай үр дүн</h3>
                <p className="text-muted-foreground text-sm">
                  3 түвшний шалгалттай. Түвшин бүрийг амжилттай давж байж дараагийн шатанд орно.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 md:px-8 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">90 хоногийн дараах өөртэйгөө уулзахад бэлэн үү?</h2>
          <Button asChild size="lg" className="h-14 px-10 text-base">
            <Link href="/sign-up">Яг одоо эхлэх</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t py-8 px-4 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} English90. Бүх эрх хуулиар хамгаалагдсан.</p>
      </footer>
    </div>
  );
}