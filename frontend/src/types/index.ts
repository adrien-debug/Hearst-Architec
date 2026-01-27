/**
 * Shared TypeScript Types
 * Hearst Mining Architect
 */

// Re-export all types from api.ts for convenience
export type {
  NetworkStats,
  CalculatorParams,
  ProfitabilityResult,
  Machine,
  MachineFilterParams,
  Farm,
  CreateFarmParams,
  MachineInstance,
  LayoutData,
  MonitoringSnapshot,
} from '@/lib/api';

// Additional types

export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isDemo?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Calculator types
export interface CalculatorFormData {
  hashrateTH: number;
  powerWatts: number;
  electricityRate: number;
  poolFeePercent: number;
  machineCost: number;
}

export type CalculatorMode = 'custom' | 'machine';

// Machine types
export type SortField = 'hashrate' | 'efficiency' | 'price';
export type SortOrder = 'asc' | 'desc';
export type CoolingType = 'Air' | 'Hydro' | 'Immersion';

export interface MachineFilters {
  searchTerm: string;
  manufacturer: string;
  cooling: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

// Manufacturer stats
export interface ManufacturerStats {
  name: string;
  machineCount: number;
  avgHashrate: number;
  avgEfficiency: number;
}

// Farm designer types
export interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  machineId?: string;
}

export interface DesignerState {
  selectedTool: 'select' | 'place' | 'delete';
  selectedMachineType: string | null;
  grid: GridCell[][];
  zoom: number;
  viewMode: '2d' | '3d';
}

export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D extends Position2D {
  z: number;
}

// Monitoring types
export interface MonitoringStats {
  totalHashrate: number;
  hashrateChange: number;
  activeWorkers: number;
  totalWorkers: number;
  averageTemperature: number;
  maxTemperature: number;
  powerConsumption: number;
  efficiency: number;
  uptime: number;
}

export interface Alert {
  id: string;
  farmId: string;
  type: 'info' | 'warning' | 'critical';
  category: 'hashrate' | 'temperature' | 'worker' | 'power' | 'network' | 'maintenance';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

// Infrastructure types
export interface InfrastructureRequirements {
  cooling: {
    heatLoadBTU: number;
    tonsOfCooling: number;
    coolingPowerKW: number;
    totalPowerWithCoolingKW: number;
    recommendedUnits: number;
  };
  electrical: {
    totalCurrentAmps: number;
    breakerSizeAmps: number;
    transformerSizeKVA: number;
    recommendedCircuits: number;
  };
}

// Form event types
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;
export type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>;

// Component prop types
export interface WithClassName {
  className?: string;
}

export interface WithChildren {
  children: React.ReactNode;
}

export interface CardProps extends WithClassName, WithChildren {
  hover?: boolean;
}

export interface ButtonProps extends WithClassName {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: ButtonClickEvent;
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends WithClassName {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: InputChangeEvent) => void;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  disabled?: boolean;
  error?: string;
  min?: number;
  max?: number;
  step?: number | string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends WithClassName {
  label?: string;
  value: string;
  onChange: (e: SelectChangeEvent) => void;
  options: SelectOption[];
  disabled?: boolean;
  error?: string;
}
