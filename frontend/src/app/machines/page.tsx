'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { machinesApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCurrency, formatPower } from '@/lib/utils';
import { 
  Cpu, 
  Zap, 
  Gauge, 
  DollarSign, 
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Wind,
  Droplets
} from 'lucide-react';

export default function MachinesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'hashrate' | 'efficiency' | 'price'>('hashrate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterCooling, setFilterCooling] = useState('');

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: machinesApi.getAll,
  });

  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: machinesApi.getManufacturers,
  });

  // Filter and sort machines
  const filteredMachines = machines
    ?.filter(m => {
      const matchesSearch = m.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesManufacturer = !filterManufacturer || m.manufacturer === filterManufacturer;
      const matchesCooling = !filterCooling || m.cooling === filterCooling;
      return matchesSearch && matchesManufacturer && matchesCooling;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'hashrate':
          comparison = a.hashrateTH - b.hashrateTH;
          break;
        case 'efficiency':
          comparison = a.efficiency - b.efficiency;
          break;
        case 'price':
          comparison = (a.msrpUSD || 0) - (b.msrpUSD || 0);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const toggleSort = (field: 'hashrate' | 'efficiency' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronUp className="w-4 h-4" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          ASIC Machine Catalog
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Browse and compare the latest Bitcoin mining ASICs with detailed specifications
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select
              label="Manufacturer"
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              options={[
                { value: '', label: 'All Manufacturers' },
                ...(manufacturers?.map(m => ({ value: m.name, label: m.name })) || [])
              ]}
            />

            <Select
              label="Cooling"
              value={filterCooling}
              onChange={(e) => setFilterCooling(e.target.value)}
              options={[
                { value: '', label: 'All Cooling Types' },
                { value: 'Air', label: 'Air Cooled' },
                { value: 'Hydro', label: 'Hydro/Immersion' },
              ]}
            />

            <div className="flex gap-2">
              <Button
                variant={sortBy === 'hashrate' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleSort('hashrate')}
              >
                Hashrate <SortIcon field="hashrate" />
              </Button>
              <Button
                variant={sortBy === 'efficiency' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleSort('efficiency')}
              >
                Efficiency <SortIcon field="efficiency" />
              </Button>
              <Button
                variant={sortBy === 'price' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggleSort('price')}
              >
                Price <SortIcon field="price" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machines Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-hearst-green border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-slate-600">Loading machines...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines?.map((machine) => (
            <Card key={machine.id} hover className="overflow-hidden">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm text-slate-500">{machine.manufacturer}</div>
                    <h3 className="text-lg font-bold text-slate-900">{machine.model}</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    machine.cooling === 'Hydro' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {machine.cooling === 'Hydro' ? (
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> Hydro
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3" /> Air
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <Cpu className="w-5 h-5 text-hearst-green mx-auto mb-1" />
                    <div className="text-2xl font-bold text-slate-900">
                      {machine.hashrateTH}
                    </div>
                    <div className="text-xs text-slate-500">TH/s</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <Zap className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-slate-900">
                      {formatPower(machine.powerWatts)}
                    </div>
                    <div className="text-xs text-slate-500">Power</div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Gauge className="w-4 h-4" /> Efficiency
                    </span>
                    <span className="font-medium text-slate-900">
                      {machine.efficiency} J/TH
                    </span>
                  </div>
                  {machine.msrpUSD && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" /> MSRP
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(machine.msrpUSD)}
                      </span>
                    </div>
                  )}
                  {machine.releaseYear && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Release Year</span>
                      <span className="font-medium text-slate-900">
                        {machine.releaseYear}
                      </span>
                    </div>
                  )}
                </div>

                {/* Value Metrics */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">$/TH</span>
                    <span className="font-medium text-slate-700">
                      {machine.msrpUSD 
                        ? formatCurrency(machine.msrpUSD / machine.hashrateTH)
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredMachines?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Cpu className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500">No machines match your filters</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchTerm('');
              setFilterManufacturer('');
              setFilterCooling('');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
