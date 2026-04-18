import { useCreateCheckoutSession, useGetPaymentStatus } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ShieldCheck, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Billing() {
  const { data: paymentStatus, isLoading } = useGetPaymentStatus();
  const checkoutMutation = useCreateCheckoutSession();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await checkoutMutation.mutateAsync({ data: { plan: "program" } });

      if (response && response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        toast({
          title: "Анхааруулга",
          description: response?.message || "Төлбөрийн систем холбогдоогүй байна.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Алдаа гарлаа",
        description: err.message || "Төлбөрийн хуудас руу шилжих үед алдаа гарлаа.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!paymentStatus) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Premium эрх</h1>
        <p className="text-muted-foreground mt-2">
          Бүх хичээлүүдийг нээж, хөтөлбөрийг бүрэн дүүрэн ашиглаарай.
        </p>
      </div>

      {!paymentStatus.providerConnected && !paymentStatus.premium && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 mb-6 text-sm">
          <strong>Анхааруулга:</strong> {paymentStatus.message || "Төлбөрийн систем тохируулагдаагүй байна."}
        </div>
      )}

      {paymentStatus.premium ? (
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <CardTitle className="text-2xl text-primary">Premium идэвхтэй</CardTitle>
            <CardDescription className="text-base mt-2">
              Та хөтөлбөрийн бүх контентыг ашиглах боломжтой боллоо.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8">
            <div className="bg-background rounded-xl p-6 border shadow-sm space-y-4 max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Бүх 90 өдрийн хичээл нээлттэй</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Бүх шалгалтууд нээлттэй</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>Хязгааргүй давтан үзэх эрх</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="h-2 w-full bg-primary" />
          <CardHeader className="text-center pb-8 pt-8">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl">English90 Premium</CardTitle>
            <CardDescription className="text-lg mt-2">
              Нэг удаагийн төлбөрөөр бүх эрхийг нээнэ
            </CardDescription>
            <div className="mt-6 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold tracking-tight text-foreground">$29</span>
              <span className="text-muted-foreground font-medium">.00</span>
            </div>
          </CardHeader>
          <CardContent className="bg-muted/30 pt-8 pb-8 px-6 sm:px-12 border-t">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <span className="text-foreground leading-tight">Бүх 90 өдрийн хичээлүүд нээгдэнэ (Түвшин 1-3)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <span className="text-foreground leading-tight">Нэгдсэн 3 шалгалт өгөх эрх</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <span className="text-foreground leading-tight">Үгийн сангийн дэлгэрэнгүй жагсаалт</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <span className="text-foreground leading-tight">Явцаа хадгалах, өөрийн хурдаар суралцах боломж</span>
              </li>
            </ul>
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-medium" 
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? "Түр хүлээнэ үү..." : "Premium идэвхжүүлэх"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Аюулгүй төлбөрийн систем (Stripe) ашиглаж байна.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}