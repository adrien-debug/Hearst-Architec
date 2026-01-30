import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loading placeholder
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-full bg-slate-200',
        className
      )}
    />
  );
}

/**
 * Skeleton for text content
 */
export function SkeletonText({ 
  lines = 1, 
  className 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for cards
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 p-6', className)}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

/**
 * Skeleton for machine cards in the catalog
 */
export function SkeletonMachineCard() {
  return (
    <div className="rounded-2xl border border-slate-200 p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 rounded-2xl p-3">
          <Skeleton className="h-5 w-5 mx-auto mb-2" />
          <Skeleton className="h-8 w-16 mx-auto mb-1" />
          <Skeleton className="h-3 w-10 mx-auto" />
        </div>
        <div className="bg-slate-50 rounded-2xl p-3">
          <Skeleton className="h-5 w-5 mx-auto mb-2" />
          <Skeleton className="h-8 w-16 mx-auto mb-1" />
          <Skeleton className="h-3 w-10 mx-auto" />
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stats/dashboard cards
 */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Skeleton for chart/graph areas
 */
export function SkeletonChart({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 p-6 bg-white', className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-2xl" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 py-3 border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-1/4' : 'flex-1'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for the 3D viewer area
 */
export function Skeleton3DViewer({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-[#0a0a0f] overflow-hidden', className)}>
      <div className="relative h-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4 bg-slate-700" />
          <Skeleton className="h-4 w-32 mx-auto bg-slate-700" />
        </div>
        {/* Grid lines effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-800/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
