import { useEffect, useState } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  CheckCircle2,
  Crown,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  User as UserIcon,
} from "lucide-react";

const LEVEL_LABEL: Record<number, string> = {
  1: "Level 1 (Анхан)",
  2: "Level 2 (Дунд)",
  3: "Level 3 (Дээд)",
};

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("mn-MN", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Account() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { signOut, openUserProfile } = useClerk();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const dirty = !!user && (name.trim() !== (user.name ?? "") || (phone.trim() || "") !== (user.phone ?? ""));

  const onSave = async () => {
    if (!name.trim()) {
      toast({ title: "Нэр шаардлагатай", description: "Нэр хоосон байж болохгүй.", variant: "destructive" });
      return;
    }
    try {
      await updateMe.mutateAsync({ data: { name: name.trim(), phone: phone.trim() || null } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Хадгалагдлаа", description: "Профайл шинэчлэгдсэн." });
    } catch (error) {
      toast({
        title: "Хадгалах амжилтгүй",
        description: error instanceof Error ? error.message : "Дахин оролдоно уу.",
        variant: "destructive",
      });
    }
  };

  const onReset = () => {
    if (!user) return;
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
  };

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Хувийн мэдээлэл</h1>
        <p className="text-muted-foreground mt-1">
          Та өөрийн нэр, утасны дугаараа шинэчлэх, бүртгэлийн тохиргоогоо удирдах боломжтой.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Профайл
          </CardTitle>
          <CardDescription>Эдгээр мэдээлэл тань зөвхөн өөрт тань харагдана.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="acc-name">Нэр</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Жишээ: Б.Болормаа"
              maxLength={100}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="acc-phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" /> Утас (заавал биш)
            </Label>
            <Input
              id="acc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9911-2233"
              maxLength={30}
              inputMode="tel"
            />
            <p className="text-xs text-muted-foreground">
              Төлбөрийн баталгаажуулалт болон чухал мэдэгдэл хүлээн авахад ашиглана.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" /> Имэйл
            </Label>
            <div className="flex items-center gap-2">
              <Input value={user.email} readOnly disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Имэйл хаягаа солихын тулд "Бүртгэлийн тохиргоо" хэсгийг ашиглана уу.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={onSave} disabled={!dirty || updateMe.isPending}>
              {updateMe.isPending ? "Хадгалж байна..." : "Хадгалах"}
            </Button>
            <Button variant="outline" onClick={onReset} disabled={!dirty || updateMe.isPending}>
              Цуцлах
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Бүртгэлийн төлөв
          </CardTitle>
          <CardDescription>Таны түвшин, эрх, бүртгүүлсэн огноо.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" /> Түвшин
              </div>
              <div className="mt-1 font-semibold">{LEVEL_LABEL[user.placementLevel] ?? `Level ${user.placementLevel}`}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {user.placementCompleted ? "Түвшин тогтоох тест өгсөн" : "Түвшин тогтоох тест өгөөгүй"}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4" /> Эрх
              </div>
              <div className="mt-1 flex items-center gap-2">
                {user.role === "admin" ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Админ
                  </Badge>
                ) : user.premium ? (
                  <Badge className="bg-primary">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Premium сурагч
                  </Badge>
                ) : (
                  <Badge variant="secondary">Үнэгүй сурагч</Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Одоогийн өдөр: {user.currentDay}/90
              </div>
            </div>

            <div className="rounded-xl border p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" /> Гишүүнчлэл эхэлсэн
              </div>
              <div className="mt-1 font-semibold">{formatDate(user.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            Системээс гарах
          </CardTitle>
          <CardDescription>Та одоогийн төхөөрөмжөөс гарах боломжтой.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Гарах
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
