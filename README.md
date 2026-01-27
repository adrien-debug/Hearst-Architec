# Hearst Mining Architect

> Bitcoin Mining Farm Design and Management Tool

---

## 🚨 RÈGLE ABSOLUE #1 - OBJETS 2D/3D BASÉS SUR DONNÉES UNIQUEMENT

### ⚠️ AUCUN OBJET DRAGGABLE SANS DONNÉES COMPLÈTES ⚠️

**CETTE RÈGLE EST NON-NÉGOCIABLE ET CRITIQUE POUR L'INTÉGRITÉ DU SYSTÈME.**

### Principe Fondamental

**INTERDICTION ABSOLUE** de créer, afficher ou permettre le déplacement (drag) d'objets 2D ou 3D (machines, conteneurs, équipements) dans le Farm Designer si :

1. ❌ L'objet **n'est pas basé sur des données réelles** de la base de données
2. ❌ L'objet **n'a pas toutes ses dimensions complètes** (longueur, largeur, hauteur)
3. ❌ L'objet **n'a pas toutes ses spécifications techniques** (hashrate, puissance, poids, etc.)

### Règles Strictes

#### ✅ AUTORISÉ (Objet valide pour drag 2D/3D)

Un objet peut être affiché et déplacé **UNIQUEMENT SI** :

```typescript
// Toutes ces conditions DOIVENT être vraies
const isValidForDrag = (object) => {
  return (
    object.id !== null &&                    // ID base de données
    object.name !== null &&                  // Nom défini
    object.dimensions?.length > 0 &&         // Longueur définie
    object.dimensions?.width > 0 &&          // Largeur définie
    object.dimensions?.height > 0 &&         // Hauteur définie
    object.weight > 0 &&                     // Poids défini
    object.specifications !== null &&        // Specs complètes
    // Pour machines mining :
    object.hashrate > 0 &&                   // Hashrate défini
    object.power_consumption > 0             // Consommation définie
  );
};
```

#### ❌ INTERDIT (Objet invalide)

**JAMAIS afficher/permettre le drag si** :

- ❌ Objet sans ID (pas en base de données)
- ❌ Dimensions manquantes ou incomplètes (`length`, `width`, `height`)
- ❌ Spécifications techniques manquantes
- ❌ Données "placeholder" ou "exemple"
- ❌ Objets "temporaires" ou "brouillon"
- ❌ Objets avec `null`, `undefined`, `0` dans les dimensions

### Validation Obligatoire

**AVANT** de rendre un objet draggable :

```typescript
// Validation stricte AVANT affichage
function validateObjectForDisplay(object: MiningObject): boolean {
  // 1. Vérifier existence données
  if (!object || !object.id) {
    console.error('❌ Objet sans ID - REJETÉ');
    return false;
  }

  // 2. Vérifier dimensions complètes
  if (!object.dimensions || 
      !object.dimensions.length || 
      !object.dimensions.width || 
      !object.dimensions.height) {
    console.error(`❌ Objet ${object.id} - Dimensions incomplètes - REJETÉ`);
    return false;
  }

  // 3. Vérifier spécifications
  if (!object.specifications || 
      !object.hashrate || 
      !object.power_consumption) {
    console.error(`❌ Objet ${object.id} - Spécifications incomplètes - REJETÉ`);
    return false;
  }

  // ✅ Objet valide
  return true;
}
```

### Workflow Obligatoire

```
1. 📊 CHARGER les données depuis la base de données (Supabase)
   ↓
2. ✅ VALIDER que TOUTES les dimensions sont présentes
   ↓
3. ✅ VALIDER que TOUTES les spécifications sont présentes
   ↓
4. ✅ SI VALIDE → Rendre l'objet draggable en 2D/3D
   ↓
5. ❌ SI INVALIDE → NE PAS afficher l'objet (ou afficher avec warning)
```

### Exemples

#### ✅ BON - Objet valide

```typescript
const validMiner = {
  id: 'uuid-123',
  name: 'Antminer S21 XP Hydro',
  dimensions: {
    length: 410,    // mm - ✅ Défini
    width: 196,     // mm - ✅ Défini
    height: 209     // mm - ✅ Défini
  },
  weight: 17.5,     // kg - ✅ Défini
  hashrate: 473,    // TH/s - ✅ Défini
  power_consumption: 5676, // W - ✅ Défini
  specifications: {
    cooling: 'hydro',
    noise_level: 50,
    // ... autres specs
  }
};

// ✅ Cet objet PEUT être affiché et draggé
```

#### ❌ MAUVAIS - Objet invalide

```typescript
const invalidMiner = {
  id: null,         // ❌ Pas d'ID
  name: 'Exemple',
  dimensions: {
    length: 0,      // ❌ Dimension manquante
    width: null,    // ❌ Dimension manquante
    height: 200
  },
  hashrate: 0,      // ❌ Spec manquante
  // ... données incomplètes
};

// ❌ Cet objet NE DOIT PAS être affiché
```

### Conséquences du Non-Respect

Si cette règle n'est pas respectée :

- 🔥 **CALCULS FAUX** - Impossible de calculer l'espace, la puissance, le refroidissement
- 🔥 **LAYOUTS INVALIDES** - Plans 2D/3D non réalistes et inutilisables
- 🔥 **PERTE DE CRÉDIBILITÉ** - Outil professionnel devenu jouet
- 🔥 **ERREURS EN CASCADE** - Bugs dans tous les calculs dépendants
- 🔥 **DONNÉES CORROMPUES** - Base de données polluée par objets invalides

### Tests de Conformité

**AVANT chaque commit** touchant le Farm Designer :

```bash
# Vérifier qu'aucun objet sans données complètes n'est draggable
npm run test:farm-designer-validation

# Vérifier que tous les objets en DB ont des dimensions
npm run test:database-integrity
```

### Rappel Final

> **"Pas de données complètes = Pas d'objet 2D/3D. JAMAIS d'exception."**

**Cette règle est NON-NÉGOCIABLE, CRITIQUE et PERMANENTE.**

---

## Overview

Hearst Mining Architect is a comprehensive platform for designing, calculating, and managing Bitcoin mining operations. It provides professional-grade tools for:

- **Profitability Calculator**: Calculate ROI, daily revenue, and break-even with live BTC data
- **ASIC Catalog**: Browse and compare latest Bitcoin mining machines
- **Object Editor**: Create and modify infrastructure objects (racks, PDU, cooling, containers, transformers)
- **Layout Builder**: Design new mining facility layouts from scratch with drag-and-drop
- **Farm Designer**: 2D/3D layout designer for mining infrastructure
- **Monitoring Dashboard**: Real-time monitoring of hashrate, workers, and alerts

## Project Structure

```
hearst-mining-architect/
├── backend/                    # Node.js/Express API
│   ├── controllers/            # Route handlers
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── middleware/             # Auth & validation middleware
│   ├── config/                 # Configuration (Firebase)
│   ├── utils/                  # Utilities (calculator, logger)
│   └── server.js               # Entry point
├── frontend/                   # Next.js 14 App
│   ├── src/app/                # Pages (App Router)
│   ├── src/components/         # React components
│   ├── src/hooks/              # Custom React hooks
│   ├── src/lib/                # Utilities & API client
│   ├── src/types/              # TypeScript type definitions
│   └── src/stores/             # State management
├── database/                   # Firebase schema
└── docs/                       # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (optional, works in mock mode without)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your Firebase credentials (optional)
nano .env

# Start development server
npm run dev
```

Backend runs on `http://localhost:3006`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3106`

## API Endpoints

### Calculator
- `POST /api/calculator/profitability` - Calculate mining profitability
- `POST /api/calculator/machine` - Calculate for specific machine
- `POST /api/calculator/compare` - Compare multiple machines
- `POST /api/calculator/infrastructure` - Calculate infrastructure needs

### Machines
- `GET /api/machines` - Get all ASIC machines
- `GET /api/machines/:id` - Get machine by ID
- `GET /api/machines/filter` - Filter machines
- `GET /api/machines/manufacturers` - Get manufacturers
- `POST /api/machines/custom` - Add custom machine

### Farms
- `GET /api/farms` - Get user's farms
- `POST /api/farms` - Create new farm
- `GET /api/farms/:id` - Get farm by ID
- `PUT /api/farms/:id` - Update farm
- `DELETE /api/farms/:id` - Delete farm
- `GET /api/farms/:id/analytics` - Get farm analytics
- `POST /api/farms/:id/layouts` - Save layout
- `GET /api/farms/:id/layouts` - Get layouts

### Monitoring
- `POST /api/monitoring/:farmId/snapshot` - Record snapshot
- `GET /api/monitoring/:farmId/history` - Get history
- `GET /api/monitoring/:farmId/summary` - Get summary
- `GET /api/monitoring/:farmId/alerts` - Get alerts

### Network
- `GET /api/network/stats` - Get BTC network stats
- `GET /api/network/price` - Get BTC price
- `GET /api/network/difficulty` - Get difficulty
- `GET /api/network/fees` - Get mempool fees

### Objects (Infrastructure)
- `GET /api/objects` - Get all objects (optional `?category=` filter)
- `GET /api/objects/categories` - Get categories with counts
- `GET /api/objects/templates` - Get all available templates (HD5, EC2-DT, etc.)
- `GET /api/objects/subtypes/:category` - Get subtypes for a category
- `GET /api/objects/:id` - Get object by ID
- `POST /api/objects` - Create new object
- `POST /api/objects/from-template` - Create object from template
- `POST /api/objects/assemble` - Assemble module (container + cooling)
- `PUT /api/objects/:id` - Update object
- `DELETE /api/objects/:id` - Delete object
- `POST /api/objects/:id/duplicate` - Duplicate object

### Layouts
- `GET /api/layouts` - Get all layouts
- `POST /api/layouts` - Create new layout
- `POST /api/layouts/import` - Import layout from JSON
- `GET /api/layouts/:id` - Get layout by ID
- `PUT /api/layouts/:id` - Update layout
- `DELETE /api/layouts/:id` - Delete layout
- `POST /api/layouts/:id/duplicate` - Duplicate layout
- `GET /api/layouts/:id/export` - Export layout as JSON
- `POST /api/layouts/:id/placements` - Add placement to layout
- `DELETE /api/layouts/:id/placements/:placementId` - Remove placement

## Configuration

### Backend Environment Variables

```env
PORT=3006
NODE_ENV=development

# Firebase (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Electricity Rates
DEFAULT_ELECTRICITY_RATE=0.05
QATAR_ELECTRICITY_RATE=0.03

# CORS
CORS_ORIGINS=http://localhost:3106
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3006

# Firebase (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## Features

### Profitability Calculator
- Live BTC price and network difficulty
- Support for custom or catalog machines
- ROI and break-even calculations
- Infrastructure requirements (cooling, electrical)

### ASIC Machine Catalog
- Pre-loaded catalog with latest miners
- Filter by manufacturer, hashrate, efficiency
- Compare multiple machines side-by-side
- Add custom machines

### Object Editor (`/objects`)
- Create and modify infrastructure objects
- Categories: Racks, PDU, Cooling, Networking, Containers, Transformers
- Full dimension editing (width, height, depth in mm)
- Category-specific properties (slots, capacity, power)
- Color customization for 3D visualization
- Duplicate and delete objects

### Pre-loaded Catalog (Supabase)

Equipment is stored in the `catalog` table with full specs in JSONB format.

#### Bitmain ANTSPACE HD5 (308 Slots)
| Specification | Value |
|---------------|-------|
| **Ref** | `ANTSPACE-HD5` |
| **Dimensions** | 12,196 × 2,438 × 2,896 mm |
| **Capacity** | 308 hydro-cooled slots |
| **Power** | 1,512 kW (normal) / 1,765 kW (max) |
| **Voltage** | 400V ±5%, 50/60Hz |
| **Weight** | 11T (shipping) / 17.2T (operating) |
| **Price** | $90,000 |

#### Bitmain EC2-DT Dry Cooler
| Specification | Value |
|---------------|-------|
| **Ref** | `EC2-DT` |
| **Dimensions** | 12,192 × 2,438 × 2,896 mm |
| **Heat Dissipation** | 1,500 kW |
| **Operating Power** | ≤80 kW |
| **Outlet Temp** | 35°C ±1°C @ 30°C ambient |
| **Price** | $45,000 |

#### Transformer 3.75 MVA
| Specification | Value |
|---------------|-------|
| **Ref** | `TRANSFORMER-3750KVA` |
| **Capacity** | 3,750 kVA |
| **Powers** | 2× ANTSPACE HD5 containers |
| **Price** | $35,000 |

### Layout Builder (`/layouts`)
- Create new mining facility layouts from scratch
- Grid-based 2D canvas with snapping
- Place machines and infrastructure objects
- Tools: Select/Move, Place, Delete
- Object palette with machines and infrastructure
- Save, export, and import layouts
- Layout statistics (total items, machines, infrastructure)

### Farm Designer (`/designer`)
- 2D grid-based layout
- 3D Three.js visualization
- Drag-and-drop machine placement
- Infrastructure components (racks, PDUs, cooling)

### Monitoring Dashboard
- Real-time hashrate tracking
- Worker status overview
- Temperature monitoring
- Alert management

## Security

### Authentication
- JWT-based authentication via middleware
- Demo mode for development (no token required)
- Role-based access control (admin, user, viewer)

### Input Validation
- All inputs validated using `express-validator`
- Sanitization to prevent injection attacks
- Type checking and range validation

### API Protection
- Rate limiting (100 requests per 15 minutes)
- Security headers via Helmet
- CORS configured for allowed origins

### Circuit Breaker
- External API calls protected with circuit breaker pattern
- Automatic fallback to cached data
- Prevents cascading failures

### Protected Routes
| Route | Auth Required | Notes |
|-------|---------------|-------|
| `/api/calculator/*` | No | Public calculations |
| `/api/machines` | No | Public catalog |
| `/api/machines/custom` | Yes | Requires auth |
| `/api/farms/*` | Yes | All farm routes |
| `/api/monitoring/*` | Yes | All monitoring routes |
| `/api/network/*` | No | Public network data |

## Technology Stack

### Backend
- Node.js 18+
- Express.js
- Firebase Admin SDK
- express-validator for input validation
- Rate limiting & security headers (Helmet)

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript (strict mode)
- Tailwind CSS
- Three.js / React Three Fiber
- TanStack Query
- Error Boundary for error handling
- Recharts

### Database
- Firebase Firestore
- Works in mock mode without Firebase

## Ports

| Service | Port |
|---------|------|
| Backend | 3006 |
| Frontend | 3106 |

## Development

### Run Both Services

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

### Build for Production

```bash
# Backend (no build needed, just start)
cd backend && npm start

# Frontend
cd frontend && npm run build && npm start
```

## Files Added/Modified

### Backend Controllers (New/Updated)
- `controllers/objectController.js` - Infrastructure objects CRUD
- `controllers/layoutController.js` - Layout management & placements
- `routes/objectRoutes.js` - Object API routes
- `routes/layoutRoutes.js` - Layout API routes

### Backend Middleware
- `middleware/authMiddleware.js` - JWT authentication & demo mode
- `middleware/validationMiddleware.js` - Input validation with express-validator
- `middleware/index.js` - Middleware exports

### Frontend Pages (New)
- `app/objects/page.tsx` - Object Editor page
- `app/layouts/page.tsx` - Layout Builder page

### Frontend Components (New)
- `components/ErrorBoundary.tsx` - React error boundary
- `components/ui/skeleton.tsx` - Loading skeleton components
- `hooks/useApi.ts` - Custom API hooks
- `types/index.ts` - Shared TypeScript types

### Frontend API (Updated)
- `lib/api.ts` - Added objectsApi and layoutsApi clients

### Navigation (Updated)
- `components/layout/navbar.tsx` - Added Objects and Layouts menu items

### Security Improvements
- All farm/monitoring routes now require authentication
- Input validation on all POST/PUT endpoints
- Circuit breaker pattern for external APIs
- Removed `demo-user` fallback in production

## License

Proprietary - Hearst Corporation

---

Hearst Mining Architect v1.2.0 - Object Editor & Layout Builder
