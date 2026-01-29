# Hearst Mining Architect - Database Schema

> **Note**: Cette application utilise **Supabase** (PostgreSQL) comme base de données principale.
> Les tables ci-dessous sont documentées pour référence.

## Tables Structure

---

### `infrastructure_templates`
Predefined templates for infrastructure objects (containers, cooling, transformers, power blocks).

```sql
CREATE TABLE infrastructure_templates (
  id UUID PRIMARY KEY,
  category VARCHAR(50),          -- 'containers', 'cooling', 'transformers', 'powerblocks', 'pdu', 'racks'
  subtype_id VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  description TEXT,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  
  -- Dimensions (mm)
  width_mm INTEGER,
  height_mm INTEGER,
  depth_mm INTEGER,
  weight_kg NUMERIC,
  
  -- Power specifications
  power_capacity_kw NUMERIC,
  power_capacity_mva NUMERIC,
  input_voltage INTEGER,
  output_voltage INTEGER,
  
  -- Category-specific
  machine_slots INTEGER,         -- For containers
  cooling_capacity_kw NUMERIC,   -- For cooling
  max_containers INTEGER,        -- For power blocks
  transformer_count INTEGER,     -- For power blocks
  
  -- 3D rendering
  color VARCHAR(20),
  model_3d_type VARCHAR(50),     -- 'iso-container', 'bitmain-cooling', 'transformer-oil', 'power-block'
  
  specs JSONB,
  compatible_with TEXT[],
  mount_points TEXT[],
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `infrastructure_objects`
User-created instances of infrastructure objects.

```sql
CREATE TABLE infrastructure_objects (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES farm_designer_projects(id),
  template_id UUID REFERENCES infrastructure_templates(id),
  
  category VARCHAR(50),
  name VARCHAR(255),
  
  -- Dimensions (mm)
  width_mm INTEGER,
  height_mm INTEGER,
  depth_mm INTEGER,
  
  -- 3D Position (meters)
  position_x NUMERIC,
  position_y NUMERIC,
  position_z NUMERIC,
  rotation_y NUMERIC,
  
  color VARCHAR(20),
  custom_props JSONB,
  status VARCHAR(50),            -- 'planned', 'installed', 'operational'
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `mining_layouts`
3D designer layouts with objects and groups. Used by the designer page for cloud storage.

```sql
CREATE TABLE mining_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Dimensions (mm)
  dimensions JSONB DEFAULT '{"width": 50000, "height": 30000, "depth": 10000}',
  grid JSONB DEFAULT '{"cellSize": 1000, "rows": 30, "cols": 50}',
  
  -- 3D Objects array
  objects JSONB DEFAULT '[]',       -- Array of Object3D
  groups JSONB DEFAULT '[]',        -- Array of ObjectGroup
  
  -- Legacy placements
  placements JSONB DEFAULT '[]',
  infrastructure JSONB DEFAULT '{}',
  
  -- Statistics (auto-calculated)
  statistics JSONB DEFAULT '{
    "totalObjects": 0,
    "containers": 0,
    "transformers": 0,
    "coolers": 0,
    "totalMachines": 0,
    "totalHashrateTH": 0,
    "totalPowerMW": 0,
    "estimatedCost": 0
  }',
  
  status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'active', 'archived'
  imported_from UUID,                   -- Reference if imported
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mining_layouts_status ON mining_layouts(status);
CREATE INDEX idx_mining_layouts_updated ON mining_layouts(updated_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_mining_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mining_layouts_updated_at
  BEFORE UPDATE ON mining_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_mining_layouts_updated_at();
```

### `infrastructure_modules`
Assembled modules (container + cooling, etc.).

```sql
CREATE TABLE infrastructure_modules (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES farm_designer_projects(id),
  name VARCHAR(255),
  
  base_object_id UUID,
  base_template_id UUID,
  
  -- Combined dimensions
  combined_width_mm INTEGER,
  combined_height_mm INTEGER,
  combined_depth_mm INTEGER,
  
  -- Aggregated specs
  total_power_kw NUMERIC,
  machine_slots INTEGER,
  cooling_capacity_kw NUMERIC,
  
  attachments JSONB,             -- Array of attached objects
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### `users`
User accounts and profiles.

```javascript
{
  id: string,                    // Firebase Auth UID
  email: string,
  displayName: string,
  role: 'admin' | 'user' | 'viewer',
  createdAt: timestamp,
  updatedAt: timestamp,
  settings: {
    defaultElectricityRate: number,
    preferredCurrency: string,
    timezone: string
  }
}
```

### `farms`
Mining farm definitions and configurations.

```javascript
{
  id: string,
  userId: string,                // Owner's UID
  name: string,
  location: {
    country: string,
    city: string,
    coordinates?: { lat: number, lng: number }
  },
  electricityRate: number,       // USD per kWh
  pueRatio: number,              // Power Usage Effectiveness (1.0 - 2.0)
  voltage: number,               // 480V typical for industrial
  totalCapacityMW: number,       // Maximum power capacity
  machines: [                    // Array of machine instances
    {
      instanceId: string,
      machineId: string,         // Reference to machine_catalog
      position: { x: number, y: number, z: number },
      status: 'planned' | 'installed' | 'active' | 'maintenance' | 'offline',
      addedAt: timestamp,
      cost: number
    }
  ],
  status: 'planning' | 'construction' | 'operational' | 'decommissioned',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `layouts`
2D/3D farm layout designs.

```javascript
{
  id: string,
  farmId: string,
  userId: string,
  name: string,
  dimensions: {
    width: number,               // meters
    height: number,              // meters
    depth: number                // meters (for 3D)
  },
  grid: {
    cellSize: number,            // meters per cell
    rows: number,
    cols: number
  },
  placements: [
    {
      instanceId: string,
      machineId: string,
      position: { x: number, y: number, z: number },
      rotation: number
    }
  ],
  infrastructure: {
    racks: [
      {
        id: string,
        position: { x: number, y: number, z: number },
        slots: number,
        type: string
      }
    ],
    pdu: [
      {
        id: string,
        position: { x: number, y: number },
        capacity: number,
        circuits: number
      }
    ],
    cooling: [
      {
        id: string,
        type: 'hvac' | 'immersion' | 'evaporative',
        position: { x: number, y: number },
        capacity: number          // BTU/hr or tons
      }
    ],
    networking: [
      {
        id: string,
        type: 'switch' | 'router' | 'cable_tray',
        position: { x: number, y: number }
      }
    ]
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `machine_catalog`
Reference catalog of ASIC miners.

```javascript
{
  id: string,                    // e.g., 'antminer-s21-pro'
  manufacturer: string,
  model: string,
  hashrateTH: number,
  powerWatts: number,
  efficiency: number,            // J/TH
  algorithm: string,             // 'SHA-256'
  releaseYear: number,
  msrpUSD: number,
  dimensions: {
    width: number,               // mm
    height: number,
    depth: number
  },
  weight: number,                // kg
  noise: number,                 // dB
  cooling: 'Air' | 'Hydro' | 'Immersion',
  status: 'available' | 'discontinued' | 'upcoming',
  isCustom: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `monitoring`
Real-time monitoring snapshots.

```javascript
{
  id: string,
  farmId: string,
  timestamp: timestamp,
  metrics: {
    totalHashrate: number,       // TH/s
    activeWorkers: number,
    totalWorkers: number,
    temperature: {
      avg: number,
      min: number,
      max: number
    },
    powerConsumption: number,    // Watts
    efficiency: number           // J/TH
  },
  poolStats: {
    pool: string,
    acceptedShares: number,
    rejectedShares: number,
    staleShares: number
  },
  machineStatus: [
    {
      instanceId: string,
      hashrate: number,
      temperature: number,
      fanSpeed: number,
      status: 'online' | 'warning' | 'offline'
    }
  ]
}
```

### `alerts`
System alerts and notifications.

```javascript
{
  id: string,
  farmId: string,
  type: 'info' | 'warning' | 'critical',
  category: 'hashrate' | 'temperature' | 'power' | 'worker' | 'pool' | 'system',
  title: string,
  message: string,
  threshold: number,
  currentValue: number,
  machineId: string | null,
  acknowledged: boolean,
  acknowledgedAt: timestamp | null,
  resolved: boolean,
  resolvedAt: timestamp | null,
  resolution: string,
  createdAt: timestamp
}
```

### `calculations`
Saved profitability calculations.

```javascript
{
  id: string,
  userId: string,
  name: string,
  inputs: {
    hashrateTH: number,
    powerWatts: number,
    electricityRate: number,
    poolFeePercent: number,
    machineCost: number,
    networkDifficulty: number,
    btcPrice: number
  },
  results: {
    btc: { daily: number, monthly: number, yearly: number },
    revenue: { daily: number, monthly: number, yearly: number },
    powerCost: { daily: number, monthly: number, yearly: number },
    profit: { daily: number, monthly: number, yearly: number },
    roi: { daysToBreakeven: number, annualROIPercent: number }
  },
  createdAt: timestamp
}
```

### `electricity_rates`
Regional electricity rate reference.

```javascript
{
  id: string,
  country: string,
  region: string,
  rate: number,                  // USD per kWh
  type: 'residential' | 'commercial' | 'industrial' | 'special',
  source: string,
  updatedAt: timestamp
}
```

## Indexes

Create the following composite indexes:

1. `farms`: `userId` ASC, `createdAt` DESC
2. `layouts`: `farmId` ASC, `createdAt` DESC
3. `monitoring`: `farmId` ASC, `timestamp` DESC
4. `alerts`: `farmId` ASC, `resolved` ASC, `createdAt` DESC
5. `calculations`: `userId` ASC, `createdAt` DESC

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Farms belong to users
    match /farms/{farmId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Layouts belong to farms (check farm ownership)
    match /layouts/{layoutId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Machine catalog is read-only for users, admin can write
    match /machine_catalog/{machineId} {
      allow read: if true;
      allow write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Monitoring data tied to farms
    match /monitoring/{snapshotId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Alerts tied to farms
    match /alerts/{alertId} {
      allow read, write: if request.auth != null;
    }
    
    // Calculations belong to users
    match /calculations/{calcId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Electricity rates are public read
    match /electricity_rates/{rateId} {
      allow read: if true;
      allow write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```
