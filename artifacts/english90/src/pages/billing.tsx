import { useCheckQpayInvoice, useCreateQpayInvoice, useGetPaymentStatus, type QpayInvoice } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, CreditCard, QrCode, ShieldCheck, Star, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatMnt(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

function getQrImageSrc(invoice?: QpayInvoice | null) {
  if (!invoice?.qrImage) return null;
  if (invoice.qrImage.startsWith("http") || invoice.qrImage.startsWith("data:")) return invoice.qrImage;
  return `data:image/png;base64,${invoice.qrImage}`;
}

export default function Billing() {
  const { data: paymentStatus, isLoading, refetch } = useGetPaymentStatus();
  const createInvoice = useCreateQpayInvoice();
  const checkInvoice = useCheckQpayInvoice();
  const { toast } = useToast();
  const [activeInvoice, setActiveInvoice] = useState<QpayInvoice | null>(null);

  const handleCreateInvoice = async (productId: string) => {
    try {
      const invoice = await createInvoice.mutateAsync({ data: { productId } });
      setActiveInvoice(invoice);
      toast({ title: "Нэхэмжлэх үүслээ", description: invoice.providerConnected ? "QR кодоор төлбөрөө төлнө үү." : invoice.message || "QPay тохируулагдаагүй байна." });
    } catch (err: any) {
      toast({ title: "Алдаа гарлаа", description: err.message || "QPay нэхэмжлэх үүсгэж чадсангүй.", variant: "destructive" });
    }
  };

  const handleCheckInvoice = async () => {
    if (!activeInvoice) return;
    try {
      const invoice = await checkInvoice.mutateAsync({ invoiceId: activeInvoice.id });
      setActiveInvoice(invoice);
      await refetch();
      if (invoice.paymentStatus === "paid") {
        toast({ title: "Төлбөр амжилттай", description: "Таны худалдан авсан контент нээгдлээ." });
      } else {
        toast({ title: "Төлбөр хүлээгдэж байна", description: invoice.message || "Төлбөр баталгаажаагүй байна. Төлсний дараа дахин шалгана уу." });
      }
    } catch (err: any) {
      toast({ title: "Шалгах үед алдаа гарлаа", description: err.message || "Төлбөрийн төлөв шалгаж чадсангүй.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!paymentStatus) return null;
  const qrImage = getQrImageSrc(activeInvoice);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Premium эрх · QPay төлбөр</h1>
        <p className="text-muted-foreground mt-2">Mongolia QPay QR ашиглан хичээл, түвшин эсвэл бүх 90 өдрийн эрхээ нээгээрэй.</p>
      </div>

      {!paymentStatus.providerConnected && !paymentStatus.premium && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 text-sm">
          <strong>Анхааруулга:</strong> {paymentStatus.message}
        </div>
      )}

      {paymentStatus.premium ? (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-10 h-10" /></div>
            <CardTitle className="text-2xl text-primary">Premium идэвхтэй</CardTitle>
            <CardDescription className="text-base mt-2">Та хөтөлбөрийн бүх контентыг ашиглах боломжтой боллоо.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8">
            <div className="bg-background rounded-xl p-6 border shadow-sm space-y-4 max-w-md mx-auto">
              {["Бүх 90 өдрийн хичээл нээлттэй", "Бүх шалгалтууд нээлттэй", "Хязгааргүй давтан үзэх эрх"].map((item) => (
                <div key={item} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /><span>{item}</span></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8" /></div>
              <CardTitle className="text-3xl">English90 Premium</CardTitle>
              <CardDescription className="text-lg mt-2">Өөрт тохирох багцаа сонгоно уу</CardDescription>
            </CardHeader>
            <CardContent className="bg-muted/30 pt-8 pb-8 px-6 sm:px-10 border-t space-y-4">
              <div className="grid gap-4">
                <div className="rounded-xl border bg-background p-5 flex items-center justify-between gap-4">
                  <div><p className="font-semibold">Нэг хичээл</p><p className="text-sm text-muted-foreground">Тухайн өдрийн premium хичээл</p></div>
                  <div className="text-right"><p className="font-bold text-xl">4,900₮</p><Button variant="outline" className="mt-2" onClick={() => toast({ title: "Lesson checkout", description: "Хичээлийн доторх premium товчноос тухайн өдрийг сонгоно уу." })}>Сонгох</Button></div>
                </div>
                {[1, 2, 3].map((level) => (
                  <div key={level} className="rounded-xl border bg-background p-5 flex items-center justify-between gap-4">
                    <div><p className="font-semibold">Level {level} багц</p><p className="text-sm text-muted-foreground">30 өдрийн хичээл нээгдэнэ</p></div>
                    <div className="text-right"><p className="font-bold text-xl">29,000₮</p><Button className="mt-2" variant="outline" onClick={() => handleCreateInvoice(`level:${level}`)} disabled={createInvoice.isPending}>QPay</Button></div>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 flex items-center justify-between gap-4">
                  <div><p className="font-semibold text-lg">Бүтэн 90 өдрийн курс</p><p className="text-sm text-muted-foreground">Түвшин 1-3 бүх хичээл, давтлага, шалгалт</p></div>
                  <div className="text-right"><p className="font-bold text-2xl">79,000₮</p><Button className="mt-2" onClick={() => handleCreateInvoice("course:full")} disabled={createInvoice.isPending}>{createInvoice.isPending ? "Үүсгэж байна..." : "QPay авах"}</Button></div>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground"><CreditCard className="inline w-3 h-3 mr-1" /> QPay төлбөр төлөгдсөний дараа эрх автоматаар нээгдэнэ.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> QPay нэхэмжлэх</CardTitle>
              <CardDescription>QR кодоо банкны апп-аар уншуулаад “Төлбөр шалгах” товч дарна уу.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!activeInvoice ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Багц сонгоход QPay QR энд гарна.</div>
              ) : (
                <>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Бүтээгдэхүүн</span><span className="font-medium">{activeInvoice.productName}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Дүн</span><span className="font-bold">{formatMnt(activeInvoice.amount)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Төлөв</span><span className="font-semibold capitalize flex items-center gap-1">{activeInvoice.paymentStatus === "paid" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : activeInvoice.paymentStatus === "failed" ? <XCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-muted-foreground" />}{activeInvoice.paymentStatus}</span></div>
                  </div>
                  {qrImage ? <img src={qrImage} alt="QPay QR" className="mx-auto w-64 h-64 object-contain rounded-xl border bg-white p-3" /> : <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">{activeInvoice.message || "QR мэдээлэл буцаагдаагүй байна."}</div>}
                  {activeInvoice.paymentUrl && <Button className="w-full" variant="outline" onClick={() => window.open(activeInvoice.paymentUrl || "", "_blank")}>QPay холбоос нээх</Button>}
                  <Button className="w-full" onClick={handleCheckInvoice} disabled={checkInvoice.isPending}>{checkInvoice.isPending ? "Шалгаж байна..." : "Төлбөр шалгах"}</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
