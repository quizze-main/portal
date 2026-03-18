import { Skeleton } from '@/components/ui/skeleton';

interface KPICardSkeletonProps {
  compact?: boolean;
}

export function KPICardSkeleton({ compact = false }: KPICardSkeletonProps) {
  return (
    <div className={`bg-card rounded-xl shadow-card ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className={`${compact ? 'w-24 h-3' : 'w-32 h-4'}`} />
        </div>
        <Skeleton className="w-4 h-4" />
      </div>
      
      <div className="flex items-center justify-between mb-1.5">
        <Skeleton className="w-16 h-4" />
        <Skeleton className="w-10 h-4" />
        <Skeleton className="w-8 h-4" />
        <Skeleton className="w-14 h-4" />
      </div>
      
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function AttentionCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-3 shadow-card">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-12 h-4" />
      </div>
      <Skeleton className="w-20 h-6 mb-1" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Attention Grid Skeleton */}
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <AttentionCardSkeleton key={i} />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <Skeleton className="w-32 h-5 mb-4" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="space-y-3">
        <Skeleton className="w-40 h-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
