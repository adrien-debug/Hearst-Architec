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
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ObjectCategory {
  name: string;
  count: number;
  label: string;
}

// 3D Object type for layouts
export interface Object3D {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  dimensions: { width: number; height: number; depth: number };
  locked: boolean;
  visible: boolean;
  groupId?: string;
}

export interface ObjectGroup {
  id: string;
  name: string;
  objectIds: string[];
  locked: boolean;
}

// Layout types
export interface Layout {
  id: string;
  name: string;
  description?: string;
  dimensions: { width: number; height: number; depth?: number };
  grid: { cellSize: number; rows: number; cols: number };
  objects?: Object3D[]; // 3D scene objects
  groups?: ObjectGroup[]; // Object groups
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
    totalObjects?: number;
    containers?: number;
    transformers?: number;
    coolers?: number;
  };
  status: 'draft' | 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
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
  // Get all templates (default objects from controller)
  getTemplates: async () => {
    // Default templates in case API fails
    const defaultTemplates: { [key: string]: InfraObject[] } = {
      containers: [
        { id: 'container-antspace-hd5', name: 'ANTSPACE HD5', type: 'container', dimensions: { width: 12192, height: 2896, depth: 2438 }, color: '#e8e8e8', description: '40ft mining container - 210 slots' },
        { id: 'container-antspace-hk3', name: 'ANTSPACE HK3', type: 'container', dimensions: { width: 6058, height: 2896, depth: 2438 }, color: '#e8e8e8', description: '20ft mining container - 105 slots' },
        { id: 'container-standard-40ft', name: 'Standard 40ft', type: 'container', dimensions: { width: 12192, height: 2591, depth: 2438 }, color: '#e8e8e8', description: 'Standard 40ft ISO container' },
      ],
      cooling: [
        { id: 'cooling-ec2-dt', name: 'EC2-DT', type: 'cooling', dimensions: { width: 12192, height: 2896, depth: 2438 }, color: '#1e3a5f', description: 'Evaporative cooling unit for HD5' },
        { id: 'cooling-immersion', name: 'Immersion Tank', type: 'cooling', dimensions: { width: 2000, height: 1500, depth: 1000 }, color: '#1e3a5f', description: 'Immersion cooling tank' },
      ],
      transformers: [
        { id: 'transformer-3.75mva', name: 'Transformer 3.75 MVA', type: 'transformer', dimensions: { width: 2200, height: 2800, depth: 1800 }, color: '#f59e0b', description: '33kV/400V - Oil ONAN/ONAF - Pour 2 containers HD5' },
        { id: 'transformer-4mw', name: 'Transformer 4MW', type: 'transformer', dimensions: { width: 2500, height: 3000, depth: 2000 }, color: '#f59e0b', description: '4MW power transformer' },
        { id: 'transformer-2mw', name: 'Transformer 2MW', type: 'transformer', dimensions: { width: 2000, height: 2500, depth: 1500 }, color: '#f59e0b', description: '2MW power transformer' },
        { id: 'transformer-1mw', name: 'Transformer 1MW', type: 'transformer', dimensions: { width: 1500, height: 2000, depth: 1200 }, color: '#f59e0b', description: '1MW power transformer' },
        { id: 'rmu-33kv', name: 'RMU 33kV ABB SafeRing', type: 'transformer', dimensions: { width: 1200, height: 1800, depth: 800 }, color: '#1f2937', description: 'Ring Main Unit 33kV SF6 3-way' },
      ],
      pdu: [
        { id: 'pdu-lv-3mw', name: 'LV Distribution Skid 3 MW', type: 'distribution', dimensions: { width: 2400, height: 2200, depth: 800 }, color: '#374151', description: 'ACB 6300A + 2-3 MCCB 2500A départs - IP54' },
        { id: 'pdu-lv-1.5mw', name: 'LV Distribution Skid 1.5 MW', type: 'distribution', dimensions: { width: 1600, height: 2200, depth: 800 }, color: '#374151', description: 'ACB 3200A + 1-2 MCCB 1600A départs - IP54' },
        { id: 'pdu-standard', name: 'PDU Standard', type: 'pdu', dimensions: { width: 600, height: 2000, depth: 600 }, color: '#8b5cf6', description: 'Power Distribution Unit' },
        { id: 'switchboard-mns', name: 'ABB MNS LV Switchboard', type: 'distribution', dimensions: { width: 2000, height: 2200, depth: 800 }, color: '#374151', description: 'Tableau BT 4000A modulaire' },
      ],
      racks: [
        { id: 'rack-42u', name: 'Rack 42U', type: 'rack', dimensions: { width: 600, height: 2000, depth: 1000 }, color: '#22c55e', description: '42U server rack' },
      ],
      networking: [
        { id: 'switch-48port', name: 'Switch 48-Port', type: 'networking', dimensions: { width: 440, height: 44, depth: 300 }, color: '#06b6d4', description: '48-port network switch' },
      ],
      solar: [
        { id: 'canopy-qatar-100mw', name: 'Canopy Solaire Qatar 100MW', type: 'solar-canopy', dimensions: { width: 44000, height: 2000, depth: 28000 }, color: '#1e3a5f', description: 'Structure solaire pour 8 containers - 8 ouvertures extraction thermique' },
        { id: 'canopy-4-containers', name: 'Canopy Solaire 4 Containers', type: 'solar-canopy', dimensions: { width: 22000, height: 2000, depth: 28000 }, color: '#1e3a5f', description: 'Structure solaire pour 4 containers - 4 ouvertures extraction' },
        { id: 'canopy-2-containers', name: 'Canopy Solaire 2 Containers', type: 'solar-canopy', dimensions: { width: 16000, height: 2000, depth: 14000 }, color: '#1e3a5f', description: 'Structure solaire pour 2 containers - 2 ouvertures extraction' },
        { id: 'canopy-parking', name: 'Ombrière Parking Solaire', type: 'solar-canopy', dimensions: { width: 20000, height: 2000, depth: 10000 }, color: '#1e3a5f', description: 'Ombrière parking avec panneaux solaires' },
      ],
      modules: [],
      powerblocks: [],
    };

    try {
      const response = await fetchApi<{ data: Array<{
        id: string;
        category: string;
        subtypeId: string;
        description?: string;
        dimensions: { width: number; height: number; depth: number };
        [key: string]: unknown;
      }> }>('/api/objects/templates');
      
      // Group templates by category for library display
      const grouped: { [key: string]: InfraObject[] } = {
        racks: [], pdu: [], cooling: [], networking: [],
        containers: [], transformers: [], powerblocks: [], modules: [], solar: []
      };
      
      for (const template of response.data || []) {
        const category = template.category;
        if (grouped[category]) {
          grouped[category].push({
            ...template,
            id: template.id,
            name: template.subtypeId || template.name,
            type: category.slice(0, -1), // containers -> container
            dimensions: template.dimensions,
            color: category === 'containers' ? '#e8e8e8' : 
                   category === 'cooling' ? '#1e3a5f' : 
                   category === 'transformers' ? '#f59e0b' : '#8AFD81',
            description: template.description,
          } as InfraObject);
        }
      }
      
      // Merge with defaults (API results take priority)
      const hasApiData = Object.values(grouped).some(arr => arr.length > 0);
      return hasApiData ? grouped : defaultTemplates;
    } catch (error) {
      console.warn('API failed, using default templates:', error);
      return defaultTemplates;
    }
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

// AI Implantation API
export type EngineerProfile = 'generalist' | 'electrical' | 'mining' | 'thermal' | '3d';

export interface AIImplantationParams {
  availableObjects: { [key: string]: InfraObject[] };
  dimensions: { width: number; depth: number };
  targetPowerMW?: number;
  constraints?: object;
  existingPlacements?: object[];
  preferences?: object;
  model?: 'auto' | 'claude' | 'gpt' | 'gemini';
  userPrompt?: string;
  engineerProfile?: EngineerProfile;
  engineerSkills?: string[];
}

export interface AIPlacement {
  objectId: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

export interface AIImplantationResult {
  success: boolean;
  model: string;
  placements: AIPlacement[];
  statistics: {
    totalPowerKW: number;
    totalHashrateTH: number;
    machineSlots: number;
    coolingCapacityKW: number;
    utilizationPercent: number;
  };
  zones: Array<{
    name: string;
    type: string;
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }>;
  recommendations: string[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface AIProviderStatus {
  configured: boolean;
  model: string;
  priority?: string;
  description?: string;
}

export interface AIStatus {
  available: boolean;
  providers: {
    claude: AIProviderStatus;
    openai: AIProviderStatus;
    gemini: AIProviderStatus;
  };
}

export const aiApi = {
  generateImplantation: (params: AIImplantationParams) =>
    fetchApi<AIImplantationResult>('/api/ai/implantation', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  optimize: (params: { currentPlacements: object[]; availableObjects: object; dimensions: object; optimizationGoal?: string }) =>
    fetchApi<AIImplantationResult>('/api/ai/optimize', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getSuggestions: (params: { currentPlacements: object[]; availableObjects: object; dimensions: object }) =>
    fetchApi<{ recommendations: string[]; statistics: object; potentialImprovements: object[] }>('/api/ai/suggest', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getStatus: () => fetchApi<AIStatus>('/api/ai/status'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED TOOLS API (PRO - DÉBRIDÉ)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThermalCalculationParams {
  totalPowerKW: number;
  coolingType?: 'hydro' | 'air' | 'immersion';
  ambientTempC?: number;
  targetTempC?: number;
  altitude?: number;
  humidity?: number;
  safetyMargin?: number;
}

export interface ThermalCalculationResult {
  input: ThermalCalculationParams;
  thermalLoad: {
    heatLoadKW: number;
    heatLoadBTU: number;
    tonsOfCooling: number;
  };
  cooling: {
    recommendedCapacityKW: number;
    coolingPowerKW: number;
    pueEstimate: number;
    recommendedUnits: number;
    unitCapacityKW: number;
  };
  flow: {
    deltaT: number;
    waterFlowM3h: number;
    waterFlowLPM: number;
    airflowCFM: number;
    airflowM3h: number;
  };
  environment: {
    dewPointC: number;
    condensationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    altitudeCorrection: string;
    humidityCorrection: string;
  };
  recommendations: string[];
}

export interface ElectricalCalculationParams {
  totalPowerKW: number;
  voltage?: number;
  powerFactor?: number;
  diversityFactor?: number;
  safetyMargin?: number;
}

export interface ElectricalCalculationResult {
  input: ElectricalCalculationParams;
  power: {
    activePowerKW: number;
    apparentPowerKVA: number;
    reactivePowerKVAR: number;
  };
  current: {
    nominalA: number;
    designA: number;
    perPhaseA: number;
  };
  transformer: {
    totalSizeKVA: number;
    count: number;
    unitSizeKVA: number;
    estimatedLossesKW: number;
  };
  distribution: {
    tgbtRatingA: number;
    pduCount: number;
    pduRatingA: number;
    cableSectionMm2: number;
    busbarRequired: boolean;
  };
  backup: {
    gensetSizeKVA: number;
    fuelConsumptionLh: number;
    autonomy24hFuelL: number;
    recommendedTankL: number;
  };
  metering: object;
  protection: object;
  cables: Array<{ from: string; to: string; type: string; length: number; description: string }>;
}

export interface EquipmentSearchResult {
  id: string;
  category: string;
  manufacturer: string;
  model: string;
  hashrateTH?: number;
  powerWatts?: number;
  efficiency?: number;
  cooling?: string;
  dimensions?: { width: number; height: number; depth: number };
  msrpUSD?: number;
  availability?: string;
  sources?: string[];
}

export interface MarketData {
  bitcoin: {
    price: number;
    change24h: number;
    source: string;
  };
  network: {
    difficulty: number;
    source: string;
  };
  electricityPrices: Record<string, number>;
  profitability: {
    revenuePerTHDailyUSD: number;
    breakEvenEfficiency: Record<string, number>;
    mostProfitableRegion: { region: string; profit: number; electricityRate: number };
  };
  timestamp: string;
  sources: string[];
}

export interface LayoutRecommendations {
  warnings: Array<{ type: 'critical' | 'warning'; message: string; action: string }>;
  optimizations: Array<{ type: string; message: string; suggestion: string }>;
  recommendations: Array<{ type: string; message: string }>;
  score: number;
  summary: string;
}

export const advancedToolsApi = {
  // Equipment search
  searchEquipment: (query: string, options?: { category?: string; manufacturer?: string; minHashrate?: number; maxPrice?: number }) => {
    const params = new URLSearchParams({ q: query, ...options as Record<string, string> });
    return fetchApi<{ query: string; results: EquipmentSearchResult[]; count: number }>(`/api/tools/search?${params}`);
  },
  
  getEquipmentSpecs: (id: string) =>
    fetchApi<EquipmentSearchResult>(`/api/tools/equipment/${id}`),
  
  getAllEquipment: () =>
    fetchApi<{ query: string; results: EquipmentSearchResult[]; count: number }>('/api/tools/equipment'),

  // Thermal calculations
  calculateThermal: (params: ThermalCalculationParams) =>
    fetchApi<ThermalCalculationResult>('/api/tools/thermal', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Electrical calculations
  calculateElectrical: (params: ElectricalCalculationParams) =>
    fetchApi<ElectricalCalculationResult>('/api/tools/electrical', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Market data
  getMarketData: () =>
    fetchApi<MarketData>('/api/tools/market'),

  // Recommendations
  getRecommendations: (layoutData: { objects: object[]; metrics: object; dimensions: object }) =>
    fetchApi<LayoutRecommendations>('/api/tools/recommendations', {
      method: 'POST',
      body: JSON.stringify(layoutData),
    }),

  // Export
  exportDXF: async (data: { objects: object[]; dimensions: object; projectName?: string }) => {
    const response = await fetch(`${API_BASE}/api/tools/export/dxf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.blob();
  },

  exportJSON: async (data: { objects: object[]; dimensions: object; projectName?: string; metrics?: object }) => {
    const response = await fetch(`${API_BASE}/api/tools/export/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Quick calculators
  quickBTU: (kw: number) =>
    fetchApi<{ input: { kW: number }; output: { BTUh: number; tonsOfCooling: number } }>(`/api/tools/quick/btu?kw=${kw}`),
  
  quickCFM: (kw: number, deltaT?: number) =>
    fetchApi<{ input: object; output: { CFM: number; m3h: number; m3s: number } }>(`/api/tools/quick/cfm?kw=${kw}&deltaT=${deltaT || 15}`),
  
  quickWaterFlow: (kw: number, deltaT?: number) =>
    fetchApi<{ input: object; output: { m3h: number; LPM: number; GPM: number } }>(`/api/tools/quick/waterflow?kw=${kw}&deltaT=${deltaT || 10}`),
  
  quickCable: (kw: number, voltage?: number, distance?: number) =>
    fetchApi<{ input: object; output: { currentA: number; cableSectionMm2: number; cableSpec: string; voltageDropPercent: number; voltageDropOK: boolean } }>(`/api/tools/quick/cable?kw=${kw}&voltage=${voltage || 400}&distance=${distance || 20}`),
};

// Layouts API
export const layoutsApi = {
  getAll: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi<Layout[]>(`/api/layouts${query}`);
  },
  getById: (id: string) => fetchApi<Layout>(`/api/layouts/${id}`),
  create: (data: { name: string; description?: string; dimensions?: object; grid?: object; objects?: Object3D[]; groups?: ObjectGroup[] }) =>
    fetchApi<Layout>('/api/layouts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Layout>) =>
    fetchApi<Layout>(`/api/layouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  // Save 3D objects and groups to an existing layout
  saveObjects: (id: string, objects: Object3D[], groups: ObjectGroup[]) =>
    fetchApi<Layout>(`/api/layouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ objects, groups }),
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
  exportLayout: (id: string) =>
    fetchApi<Layout>(`/api/layouts/${id}/export`),
};
