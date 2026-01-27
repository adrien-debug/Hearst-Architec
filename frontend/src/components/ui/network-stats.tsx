'use client';

import { useQuery } from '@tanstack/react-query';
import { networkApi, type NetworkStats as NetworkStatsType } from '@/lib/api';
import { Bitcoin, Activity, Gauge, RefreshCw } from 'lucide-react';

export function NetworkStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['networkStats'],
    queryFn: networkApi.getStats,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
        <span className="ml-2 text-slate-400">Loading network data...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-4 text-slate-400">
        Unable to fetch network data
      </div>
    );
  }

  const stats = [
    {
      icon: Bitcoin,
      label: 'BTC Price',
      value: data.price?.formattedUSD || '$--',
      color: 'text-orange-400',
    },
    {
      icon: Activity,
      label: 'Network Hashrate',
      value: data.hashrate?.formatted || '--',
      color: 'text-blue-400',
    },
    {
      icon: Gauge,
      label: 'Difficulty',
      value: data.difficulty?.formatted || '--',
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3">
          <stat.icon className={`w-5 h-5 ${stat.color}`} />
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              {stat.label}
            </div>
            <div className="text-lg font-semibold text-white">{stat.value}</div>
          </div>
        </div>
      ))}
      <button
        onClick={() => refetch()}
        className="p-2 rounded-full hover:bg-slate-800 transition-colors"
        title="Refresh data"
      >
        <RefreshCw className="w-4 h-4 text-slate-400 hover:text-white" />
      </button>
    </div>
  );
}
