# Hearst Mining Architect - Firebase Schema

## Collections Structure

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
