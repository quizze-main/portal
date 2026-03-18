import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { optometristsData } from "@/data/mockData";
import { OptometristRankingCard, type OptometristRankingRow } from "@/components/dashboard";

export default function OptometristDetail() {
  const { optometristId } = useParams<{ optometristId: string }>();
  const navigate = useNavigate();

  const row: OptometristRankingRow | null = useMemo(() => {
    const data = optometristId ? (optometristsData as any)[optometristId] : null;
    if (!data) return null;

    const metrics = Array.isArray(data.metricsLevel1) ? data.metricsLevel1 : [];
    const get = (id: string) => metrics.find((m: any) => m.id === id);

    const planPercent = Number(get("planPercent")?.value ?? data.planPercent ?? 0);
    const lensRevenue = Number(get("lensRevenue")?.value ?? data.lensRevenue ?? 0);
    const avgLensCheck = Number(get("avgLensCheck")?.value ?? data.avgLensCheck ?? 0);
    const designShare = Number(get("designShare")?.value ?? data.designShare ?? 0);
    const lostRevenue = Number(data.lostRevenue ?? 0);

    return {
      id: data.id ?? String(optometristId),
      rank: 0,
      name: data.name ?? "Оптик",
      role: data.role ?? "Оптик",
      avatar: data.avatar,
      planPercent,
      lensRevenue,
      avgLensCheck,
      designShare,
      lostRevenue,
    } as OptometristRankingRow;
  }, [optometristId]);

  return (
    <div className="leader-dashboard-theme min-h-screen bg-gradient-main">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9" aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="text-lg font-bold text-foreground truncate">Оптометрист</div>
            <div className="text-sm text-muted-foreground truncate">Детальная страница</div>
          </div>
        </div>

        {row ? (
          <OptometristRankingCard optometrist={row} onClick={() => {}} />
        ) : (
          <div className="bg-white/80 border border-border rounded-xl p-4 text-sm text-muted-foreground">
            Оптометрист не найден: {String(optometristId || "")}
          </div>
        )}

        <div className="bg-white/80 border border-border rounded-xl p-4 text-sm text-muted-foreground">
          Эта страница отсутствовала в sandbox, но ссылка на неё есть из таблицы оптометристов. Здесь можно будет
          развернуть детализацию по аналогии с `ManagerDetail`.
        </div>
      </div>
    </div>
  );
}





