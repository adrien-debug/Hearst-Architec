'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { networkApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber, formatHashrate, formatPower } from '@/lib/utils';
import { 
  Activity, 
  Cpu, 
  Zap, 
  Thermometer, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Server
} from 'lucide-react';

// Demo data for monitoring display
const demoFarmData = {
  name: 'Qatar Farm Alpha',
  status: 'operational',
  machines: 150,
  activeMachines: 147,
  totalHashrate: 28050, // TH/s
  totalPower: 525000, // Watts
  avgTemperature: 62,
  uptime: 99.2,
  lastUpdate: new Date().toISOString(),
};

const demoWorkers = [
  { id: 1, name: 'Rack-A-001', hashrate: 234, temp: 58, status: 'online' },
  { id: 2, name: 'Rack-A-002', hashrate: 231, temp: 61, status: 'online' },
  { id: 3, name: 'Rack-A-003', hashrate: 228, temp: 64, status: 'online' },
  { id: 4, name: 'Rack-A-004', hashrate: 0, temp: 0, status: 'offline' },
  { id: 5, name: 'Rack-A-005', hashrate: 235, temp: 59, status: 'online' },
  { id: 6, name: 'Rack-B-001', hashrate: 200, temp: 62, status: 'online' },
  { id: 7, name: 'Rack-B-002', hashrate: 198, temp: 65, status: 'warning' },
  { id: 8, name: 'Rack-B-003', hashrate: 202, temp: 60, status: 'online' },
];

const demoAlerts = [
  { id: 1, type: 'warning', message: 'Rack-B-002 temperature elevated (65°C)', time: '5 min ago' },
  { id: 2, type: 'critical', message: 'Rack-A-004 offline - no response', time: '12 min ago' },
  { id: 3, type: 'info', message: 'Daily maintenance window scheduled', time: '2 hours ago' },
];

export default function MonitoringPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d'>('24h');

  const { data: networkStats, refetch: refetchNetwork } = useQuery({
    queryKey: ['networkStats'],
    queryFn: networkApi.getStats,
    refetchInterval: 60000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'operational':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'offline':
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'offline':
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Monitoring Dashboard
          </h1>
          <p className="text-slate-600">
            Real-time mining farm performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-slate-100 rounded-full p-1">
            {(['1h', '24h', '7d'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchNetwork()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Farm Status Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Hashrate</p>
                <p className="text-3xl font-bold text-green-800">
                  {formatHashrate(demoFarmData.totalHashrate)}
                </p>
              </div>
              <Activity className="w-10 h-10 text-green-500 opacity-50" />
            </div>
            <div className="mt-2 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +2.3% from yesterday
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Power Usage</p>
                <p className="text-3xl font-bold text-orange-800">
                  {formatPower(demoFarmData.totalPower)}
                </p>
              </div>
              <Zap className="w-10 h-10 text-orange-500 opacity-50" />
            </div>
            <div className="mt-2 text-sm text-orange-600">
              PUE: 1.15 • Efficiency: 18.7 J/TH
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Active Workers</p>
                <p className="text-3xl font-bold text-blue-800">
                  {demoFarmData.activeMachines}/{demoFarmData.machines}
                </p>
              </div>
              <Server className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
            <div className="mt-2 text-sm text-blue-600">
              Uptime: {demoFarmData.uptime}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Avg Temperature</p>
                <p className="text-3xl font-bold text-purple-800">
                  {demoFarmData.avgTemperature}°C
                </p>
              </div>
              <Thermometer className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
            <div className="mt-2 text-sm text-purple-600">
              Range: 55°C - 68°C
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Workers List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-hearst-green" />
                Worker Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                      <th className="pb-3 font-medium">Worker</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Hashrate</th>
                      <th className="pb-3 font-medium">Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoWorkers.map((worker) => (
                      <tr key={worker.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{worker.name}</div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(worker.status)}
                            <span className={`text-sm capitalize ${getStatusColor(worker.status)}`}>
                              {worker.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={worker.hashrate > 0 ? 'text-slate-900' : 'text-slate-400'}>
                            {worker.hashrate > 0 ? `${worker.hashrate} TH/s` : '-'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`${
                            worker.temp > 65 ? 'text-red-500' : 
                            worker.temp > 60 ? 'text-yellow-500' : 
                            worker.temp > 0 ? 'text-green-500' : 'text-slate-400'
                          }`}>
                            {worker.temp > 0 ? `${worker.temp}°C` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Network */}
        <div className="space-y-6">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-2xl ${
                      alert.type === 'critical' ? 'bg-red-50 border border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'critical' ? (
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                      ) : (
                        <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {alert.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {alert.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Network Info */}
          {networkStats && (
            <Card className="bg-[#0a0a0f] text-white">
              <CardHeader>
                <CardTitle className="text-white text-sm">Bitcoin Network</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">BTC Price</span>
                    <span className="font-bold text-orange-400">
                      {networkStats.price?.formattedUSD}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Difficulty</span>
                    <span className="font-bold text-blue-400">
                      {networkStats.difficulty?.formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Network HR</span>
                    <span className="font-bold text-purple-400">
                      {networkStats.hashrate?.formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Block Reward</span>
                    <span className="font-bold text-green-400">
                      {networkStats.blockReward} BTC
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Last Updated</p>
                <p className="font-medium text-slate-900">
                  {new Date(demoFarmData.lastUpdate).toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
