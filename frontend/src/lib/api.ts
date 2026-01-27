// Use empty string to leverage Next.js rewrites proxy (avoids CORS issues)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || 'API request failed');
  }

  return json.data !== undefined ? json.data : json;
}

// Network API
export const networkApi = {
  getStats: () => fetchApi<NetworkStats>('/api/network/stats'),
  getPrice: () => fetchApi<{ usd: number }>('/api/network/price'),
  getDifficulty: () => fetchApi<{ raw: number; formatted: string }>('/api/network/difficulty'),
};

// Calculator API
export const calculatorApi = {
  calculate: (params: CalculatorParams) =>
    fetchApi<ProfitabilityResult>('/api/calculator/profitability', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  calculateForMachine: (machineId: string, electricityRate: number, quantity?: number) =>
    fetchApi<MachineCalculationResult>('/api/calculator/machine', {
      method: 'POST',
      body: JSON.stringify({ machineId, electricityRate, quantity }),
    }),
  compare: (machineIds: string[], electricityRate: number) =>
    fetchApi('/api/calculator/compare', {
      method: 'POST',
      body: JSON.stringify({ machineIds, electricityRate }),
    }),
  calculateInfrastructure: (totalPowerWatts: number, pueRatio?: number, voltage?: number) =>
    fetchApi('/api/calculator/infrastructure', {
      method: 'POST',
      body: JSON.stringify({ totalPowerWatts, pueRatio, voltage }),
    }),
};

// Machines API
export const machinesApi = {
  getAll: () => fetchApi<Machine[]>('/api/machines'),
  getById: (id: string) => fetchApi<Machine>(`/api/machines/${id}`),
  filter: (params: MachineFilterParams) => {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][]
    ).toString();
    return fetchApi<Machine[]>(`/api/machines/filter?${queryString}`);
  },
  getManufacturers: () => fetchApi<ManufacturerStats[]>('/api/machines/manufacturers'),
};

// Farms API
export const farmsApi = {
  getAll: () => fetchApi<Farm[]>('/api/farms'),
  getById: (id: string) => fetchApi<Farm>(`/api/farms/${id}`),
  create: (data: CreateFarmParams) =>
    fetchApi<Farm>('/api/farms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Farm>) =>
    fetchApi<Farm>(`/api/farms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi(`/api/farms/${id}`, { method: 'DELETE' }),
  getAnalytics: (id: string) =>
    fetchApi(`/api/farms/${id}/analytics`),
  addMachines: (id: string, machines: MachineInstance[]) =>
    fetchApi(`/api/farms/${id}/machines`, {
      method: 'POST',
      body: JSON.stringify({ machines }),
    }),
  saveLayout: (id: string, layout: LayoutData) =>
    fetchApi(`/api/farms/${id}/layouts`, {
      method: 'POST',
      body: JSON.stringify(layout),
    }),
  getLayouts: (id: string) =>
    fetchApi<LayoutData[]>(`/api/farms/${id}/layouts`),
};

// Monitoring API
export const monitoringApi = {
  getLatest: (farmId: string) =>
    fetchApi(`/api/monitoring/${farmId}/latest`),
  getHistory: (farmId: string, params?: { startTime?: string; endTime?: string; limit?: number }) => {
    const queryString = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : '';
    return fetchApi(`/api/monitoring/${farmId}/history${queryString}`);
  },
  getSummary: (farmId: string, period?: string) =>
    fetchApi(`/api/monitoring/${farmId}/summary?period=${period || '24h'}`),
  getAlerts: (farmId: string) =>
    fetchApi(`/api/monitoring/${farmId}/alerts`),
  recordSnapshot: (farmId: string, data: MonitoringSnapshot) =>
    fetchApi(`/api/monitoring/${farmId}/snapshot`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Types
export interface NetworkStats {
  price: { usd: number; formattedUSD: string };
  difficulty: { raw: number; formatted: string };
  hashrate: { raw: number; formatted: string };
  blockReward: number;
  blocksPerDay: number;
  fetchedAt: string;
}

export interface CalculatorParams {
  hashrateTH: number;
  powerWatts: number;
  electricityRate: number;
  poolFeePercent?: number;
  machineCost?: number;
  networkDifficulty?: number;
  btcPrice?: number;
}

export interface ProfitabilityResult {
  btc: { daily: number; monthly: number; yearly: number };
  revenue: { daily: number; monthly: number; yearly: number };
  powerCost: { daily: number; monthly: number; yearly: number };
  profit: { daily: number; monthly: number; yearly: number };
  roi: { daysToBreakeven: number | null; monthsToBreakeven: number | null; annualROIPercent: number | null };
  efficiency: { joulesPerTH: number; revenuePerTH: number };
}

export interface Machine {
  id: string;
  manufacturer: string;
  model: string;
  hashrateTH: number;
  powerWatts: number;
  efficiency: number;
  algorithm: string;
  releaseYear?: number;
  msrpUSD?: number;
  dimensions?: { width: number; height: number; depth: number };
  weight?: number;
  noise?: number;
  cooling: string;
  status: string;
}

export interface MachineFilterParams {
  minHashrate?: number;
  maxHashrate?: number;
  maxEfficiency?: number;
  manufacturer?: string;
  cooling?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface Farm {
  id: string;
  name: string;
  location?: { country?: string; city?: string };
  electricityRate: number;
  pueRatio: number;
  voltage: number;
  totalCapacityMW?: number;
  machines: MachineInstance[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmParams {
  name: string;
  location?: { country?: string; city?: string };
  electricityRate?: number;
  pueRatio?: number;
  voltage?: number;
  totalCapacityMW?: number;
}

export interface MachineInstance {
  machineId: string;
  instanceId?: string;
  hashrateTH: number;
  powerWatts: number;
  position?: { x: number; y: number; z?: number };
  status?: string;
  cost?: number;
}

export interface LayoutData {
  name?: string;
  dimensions?: { width: number; height: number; depth?: number };
  grid?: { cellSize: number; rows: number; cols: number };
  placements?: MachineInstance[];
  infrastructure?: {
    racks: object[];
    pdu: object[];
    cooling: object[];
    networking: object[];
  };
}

export interface MonitoringSnapshot {
  totalHashrate?: number;
  activeWorkers?: number;
  totalWorkers?: number;
  temperature?: { avg?: number; max?: number };
  powerConsumption?: number;
  efficiency?: number;
  poolStats?: object;
  machineStatus?: object[];
}

export interface ManufacturerStats {
  name: string;
  machineCount: number;
  avgHashrate: number;
  avgEfficiency: number;
}

export interface MachineCalculationResult {
  machine: {
    id: string;
    model: string;
    manufacturer: string;
    quantity: number;
  };
  networkStats: {
    btcPrice: string;
    difficulty: string;
  };
  profitability: ProfitabilityResult;
}

// Infrastructure Object types
export interface InfraObject {
  id: string;
  name: string;
  type: string;
  dimensions: { width: number; height: number; depth: number };
  color?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ObjectCategory {
  name: string;
  count: number;
  label: string;
}

// Layout types
export interface Layout {
  id: string;
  name: string;
  description?: string;
  dimensions: { width: number; height: number; depth?: number };
  grid: { cellSize: number; rows: number; cols: number };
  placements: LayoutPlacement[];
  infrastructure: {
    racks: object[];
    pdu: object[];
    cooling: object[];
    networking: object[];
    containers: object[];
    transformers: object[];
  };
  statistics: {
    totalMachines: number;
    totalHashrateTH: number;
    totalPowerMW: number;
    estimatedCost: number;
  };
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface LayoutPlacement {
  placementId: string;
  objectId: string;
  objectType: string;
  position: { x: number; y: number; z?: number };
  rotation?: number;
  hashrateTH?: number;
  powerWatts?: number;
  cost?: number;
}

// Object Subtype template
export interface ObjectSubtype {
  id: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  [key: string]: unknown;
}

// Assembled Module
export interface AssembledModule {
  id: string;
  name: string;
  type: 'module';
  baseObject: {
    id: string;
    name: string;
    type: string;
    subtype?: string;
  };
  attachments: Array<{
    objectId: string;
    name: string;
    mountPoint: string;
    offset: { x: number; y: number; z: number };
  }>;
  combinedDimensions: { width: number; height: number; depth: number };
  totalPowerKW: number;
  machineSlots: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Objects API
export const objectsApi = {
  getAll: (category?: string) => {
    const query = category ? `?category=${category}` : '';
    return fetchApi<{ [key: string]: InfraObject[] }>(`/api/objects${query}`);
  },
  getById: (id: string) => fetchApi<InfraObject>(`/api/objects/${id}`),
  getCategories: () => fetchApi<ObjectCategory[]>('/api/objects/categories'),
  getSubtypes: (category: string) => 
    fetchApi<ObjectSubtype[]>(`/api/objects/subtypes/${category}`),
  create: (data: { category: string; [key: string]: unknown }) =>
    fetchApi<InfraObject>('/api/objects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createFromTemplate: (data: { category: string; subtype: string; name?: string; customProps?: object }) =>
    fetchApi<InfraObject>('/api/objects/from-template', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  assemble: (data: { name: string; baseObjectId: string; attachments?: Array<{ objectId: string; mountPoint?: string }> }) =>
    fetchApi<AssembledModule>('/api/objects/assemble', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<InfraObject>) =>
    fetchApi<InfraObject>(`/api/objects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi(`/api/objects/${id}`, { method: 'DELETE' }),
  duplicate: (id: string, newName?: string) =>
    fetchApi<InfraObject>(`/api/objects/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ newName }),
    }),
};

// Layouts API
export const layoutsApi = {
  getAll: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<Layout[]>(`/api/layouts${query}`);
  },
  getById: (id: string) => fetchApi<Layout>(`/api/layouts/${id}`),
  create: (data: { name: string; description?: string; dimensions?: object; grid?: object }) =>
    fetchApi<Layout>('/api/layouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Layout>) =>
    fetchApi<Layout>(`/api/layouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi(`/api/layouts/${id}`, { method: 'DELETE' }),
  duplicate: (id: string, newName?: string) =>
    fetchApi<Layout>(`/api/layouts/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ newName }),
    }),
  addPlacement: (id: string, placement: { objectId: string; objectType: string; position: object; rotation?: number }) =>
    fetchApi<LayoutPlacement>(`/api/layouts/${id}/placements`, {
      method: 'POST',
      body: JSON.stringify(placement),
    }),
  removePlacement: (id: string, placementId: string) =>
    fetchApi(`/api/layouts/${id}/placements/${placementId}`, { method: 'DELETE' }),
  importLayout: (data: object) =>
    fetchApi<Layout>('/api/layouts/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
