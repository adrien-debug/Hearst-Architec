'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { calculatorApi, networkApi, machinesApi, ProfitabilityResult, MachineCalculationResult } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCurrency, formatBTC, formatPower } from '@/lib/utils';
import { 
  Calculator, 
  Zap, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Cpu,
  ArrowRight
} from 'lucide-react';

export default function CalculatorPage() {
  const [mode, setMode] = useState<'custom' | 'machine'>('custom');
  const [formData, setFormData] = useState({
    hashrateTH: 200,
    powerWatts: 3500,
    electricityRate: 0.05,
    poolFeePercent: 2,
    machineCost: 5000,
  });
  const [selectedMachine, setSelectedMachine] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Fetch network stats
  const { data: networkStats } = useQuery({
    queryKey: ['networkStats'],
    queryFn: networkApi.getStats,
  });

  // Fetch machines
  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: machinesApi.getAll,
  });

  // Calculate mutation for custom inputs
  const customMutation = useMutation({
    mutationFn: () => calculatorApi.calculate(formData),
  });

  // Calculate mutation for machine selection
  const machineMutation = useMutation({
    mutationFn: () => calculatorApi.calculateForMachine(
      selectedMachine, 
      formData.electricityRate, 
      quantity
    ),
  });

  // Get the appropriate result based on mode
  const result: ProfitabilityResult | null = mode === 'machine' && selectedMachine
    ? machineMutation.data?.profitability ?? null
    : customMutation.data ?? null;

  const isPending = mode === 'machine' ? machineMutation.isPending : customMutation.isPending;

  const handleCalculate = () => {
    if (mode === 'machine' && selectedMachine) {
      machineMutation.mutate();
    } else {
      customMutation.mutate();
    }
  };

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachine(machineId);
    const machine = machines?.find(m => m.id === machineId);
    if (machine) {
      setFormData(prev => ({
        ...prev,
        hashrateTH: machine.hashrateTH,
        powerWatts: machine.powerWatts,
        machineCost: machine.msrpUSD || 0,
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Mining Profitability Calculator
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Calculate your potential mining revenue, costs, and ROI with live Bitcoin network data
        </p>
      </div>

      {/* Live Network Stats */}
      {networkStats && (
        <Card className="mb-8 bg-slate-900 border-slate-800">
          <div className="flex flex-wrap items-center justify-center gap-8 text-white">
            <div className="text-center">
              <div className="text-sm text-slate-400">BTC Price</div>
              <div className="text-xl font-bold text-orange-400">
                {networkStats.price?.formattedUSD}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Difficulty</div>
              <div className="text-xl font-bold text-blue-400">
                {networkStats.difficulty?.formatted}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Network Hashrate</div>
              <div className="text-xl font-bold text-purple-400">
                {networkStats.hashrate?.formatted}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Block Reward</div>
              <div className="text-xl font-bold text-green-400">
                {networkStats.blockReward} BTC
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-hearst-green" />
              Calculator Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={mode === 'custom' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMode('custom')}
              >
                Custom Values
              </Button>
              <Button
                variant={mode === 'machine' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMode('machine')}
              >
                Select Machine
              </Button>
            </div>

            {mode === 'machine' && machines && (
              <div className="mb-6">
                <Select
                  label="Select ASIC Miner"
                  value={selectedMachine}
                  onChange={(e) => handleMachineSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Choose a machine...' },
                    ...machines.map(m => ({
                      value: m.id,
                      label: `${m.manufacturer} ${m.model} - ${m.hashrateTH} TH/s`
                    }))
                  ]}
                />
                {selectedMachine && (
                  <div className="mt-4">
                    <Input
                      label="Quantity"
                      type="number"
                      min={1}
                      max={10000}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Hashrate"
                type="number"
                value={formData.hashrateTH * (mode === 'machine' ? quantity : 1)}
                onChange={(e) => setFormData(prev => ({ ...prev, hashrateTH: parseFloat(e.target.value) || 0 }))}
                suffix="TH/s"
                disabled={mode === 'machine'}
              />

              <Input
                label="Power Consumption"
                type="number"
                value={formData.powerWatts * (mode === 'machine' ? quantity : 1)}
                onChange={(e) => setFormData(prev => ({ ...prev, powerWatts: parseFloat(e.target.value) || 0 }))}
                suffix="Watts"
                disabled={mode === 'machine'}
              />

              <Input
                label="Electricity Rate"
                type="number"
                step="0.01"
                value={formData.electricityRate}
                onChange={(e) => setFormData(prev => ({ ...prev, electricityRate: parseFloat(e.target.value) || 0 }))}
                suffix="$/kWh"
              />

              <Input
                label="Pool Fee"
                type="number"
                step="0.1"
                value={formData.poolFeePercent}
                onChange={(e) => setFormData(prev => ({ ...prev, poolFeePercent: parseFloat(e.target.value) || 0 }))}
                suffix="%"
              />

              <Input
                label="Hardware Cost (optional)"
                type="number"
                value={formData.machineCost * (mode === 'machine' ? quantity : 1)}
                onChange={(e) => setFormData(prev => ({ ...prev, machineCost: parseFloat(e.target.value) || 0 }))}
                suffix="$"
                disabled={mode === 'machine'}
              />

                <Button
                  className="w-full mt-6"
                  onClick={handleCalculate}
                  disabled={isPending}
                >
                  {isPending ? 'Calculating...' : 'Calculate Profitability'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Revenue Card */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <TrendingUp className="w-5 h-5" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-green-600">Daily</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(result.revenue?.daily || 0)}
                      </div>
                      <div className="text-xs text-green-600">
                        {formatBTC(result.btc?.daily || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-green-600">Monthly</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(result.revenue?.monthly || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-green-600">Yearly</div>
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(result.revenue?.yearly || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Costs Card */}
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <Zap className="w-5 h-5" />
                    Power Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-red-600">Daily</div>
                      <div className="text-2xl font-bold text-red-800">
                        {formatCurrency(result.powerCost?.daily || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-red-600">Monthly</div>
                      <div className="text-2xl font-bold text-red-800">
                        {formatCurrency(result.powerCost?.monthly || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-red-600">Yearly</div>
                      <div className="text-2xl font-bold text-red-800">
                        {formatCurrency(result.powerCost?.yearly || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profit Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <DollarSign className="w-5 h-5" />
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-blue-600">Daily</div>
                      <div className={`text-2xl font-bold ${(result.profit?.daily || 0) >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
                        {formatCurrency(result.profit?.daily || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-blue-600">Monthly</div>
                      <div className={`text-2xl font-bold ${(result.profit?.monthly || 0) >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
                        {formatCurrency(result.profit?.monthly || 0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-blue-600">Yearly</div>
                      <div className={`text-2xl font-bold ${(result.profit?.yearly || 0) >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
                        {formatCurrency(result.profit?.yearly || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ROI Card */}
              {result.roi && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <Clock className="w-5 h-5" />
                      Return on Investment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-purple-600">Break-even</div>
                        <div className="text-2xl font-bold text-purple-800">
                          {result.roi.monthsToBreakeven 
                            ? `${result.roi.monthsToBreakeven} mo` 
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-purple-600">Days to ROI</div>
                        <div className="text-2xl font-bold text-purple-800">
                          {result.roi.daysToBreakeven || 'N/A'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-purple-600">Annual ROI</div>
                        <div className="text-2xl font-bold text-purple-800">
                          {result.roi.annualROIPercent 
                            ? `${result.roi.annualROIPercent}%` 
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Efficiency */}
              {result.efficiency && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-hearst-green" />
                      Efficiency Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <div className="text-sm text-slate-600">Energy Efficiency</div>
                        <div className="text-xl font-bold text-slate-900">
                          {result.efficiency.joulesPerTH} J/TH
                        </div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-xl">
                        <div className="text-sm text-slate-600">Revenue per TH/s</div>
                        <div className="text-xl font-bold text-slate-900">
                          {formatCurrency(result.efficiency.revenuePerTH)}/day
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-slate-400">
                <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Enter your parameters and click Calculate</p>
                <p className="text-sm mt-2">Results will appear here</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
