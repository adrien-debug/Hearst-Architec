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

## 🚨 RÈGLE ABSOLUE #2 - POSITION = EMPLACEMENT DE ZONE

### ⚠️ DÉFINITION STRICTE DE LA POSITION ⚠️

**CETTE RÈGLE EST NON-NÉGOCIABLE ET DÉFINIT LA TERMINOLOGIE DU PROJET.**

### Principe Fondamental

Dans Hearst Mining Architect, **POSITION** signifie toujours **EMPLACEMENT D'UNE ZONE** sur le terrain de la ferme mining.

### Définitions

| Terme | Signification | Unité |
|-------|---------------|-------|
| **Position** | Emplacement d'une zone sur le terrain | Mètres (m) |
| **Position X** | Emplacement horizontal (est-ouest) | Mètres |
| **Position Y** | Hauteur verticale (sol = 0) | Mètres |
| **Position Z** | Emplacement profondeur (nord-sud) | Mètres |

### Configuration par Défaut - Layout Standard

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEARST MINING FARM LAYOUT                     │
│                                                                  │
│  Rangée 1 (X=0)              15m              Rangée 2 (X=27.2m) │
│  ┌─────────────┐                              ┌─────────────┐    │
│  │ Container 1 │        ALLÉE CENTRALE        │ Container 5 │    │
│  │ + Cooling   │◄──────── 15 mètres ────────►│ + Cooling   │    │
│  └─────────────┘    (portes face à face)      └─────────────┘    │
│        4m ↓                                         4m ↓         │
│  ┌─────────────┐                              ┌─────────────┐    │
│  │ Container 2 │                              │ Container 6 │    │
│  │ + Cooling   │                              │ + Cooling   │    │
│  └─────────────┘                              └─────────────┘    │
│        4m ↓                                         4m ↓         │
│  ┌─────────────┐                              ┌─────────────┐    │
│  │ Container 3 │                              │ Container 7 │    │
│  │ + Cooling   │                              │ + Cooling   │    │
│  └─────────────┘                              └─────────────┘    │
│        4m ↓                                         4m ↓         │
│  ┌─────────────┐                              ┌─────────────┐    │
│  │ Container 4 │                              │ Container 8 │    │
│  │ + Cooling   │                              │ + Cooling   │    │
│  └─────────────┘                              └─────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Règles de Positionnement

1. **Container + Cooling** = 1 module (cooling sur le toit)
2. **Espacement entre modules** = 4 mètres
3. **Distance face à face** = 15 mètres entre les portes
4. **La porte est à l'arrière** du container (bande verte = indicateur porte)

### Dimensions Standard (40ft ISO Container)

| Dimension | Valeur |
|-----------|--------|
| Largeur (X) | 12.192 m |
| Hauteur (Y) | 2.896 m |
| Profondeur (Z) | 2.438 m |

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

### AI (Implantation)
- `GET /api/ai/status` - Check AI service availability
- `POST /api/ai/implantation` - Generate optimal layout using AI
- `POST /api/ai/optimize` - Optimize existing layout
- `POST /api/ai/suggest` - Get AI suggestions for current layout

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

### Advanced Tools (PRO - DÉBRIDÉ)
- `GET /api/tools/search?q=query` - Recherche équipements mining (base de données interne)
- `GET /api/tools/equipment/:id` - Specs détaillées d'un équipement
- `GET /api/tools/equipment` - Liste tous les équipements
- `POST /api/tools/thermal` - Calculs thermiques avancés (BTU, CFM, dew point)
- `POST /api/tools/electrical` - Dimensionnement électrique (transfo, PDU, câbles)
- `GET /api/tools/market` - Données marché mining live (BTC, difficulty, profitability)
- `POST /api/tools/recommendations` - Recommandations intelligentes pour layout
- `POST /api/tools/export/dxf` - Export layout en DXF (CAD)
- `POST /api/tools/export/json` - Export layout en JSON
- `GET /api/tools/quick/btu?kw=X` - Conversion rapide kW → BTU
- `GET /api/tools/quick/cfm?kw=X&deltaT=Y` - Calcul CFM pour air cooling
- `GET /api/tools/quick/waterflow?kw=X&deltaT=Y` - Calcul débit eau hydro cooling
- `GET /api/tools/quick/cable?kw=X&voltage=Y&distance=Z` - Dimensionnement câble

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

# AI APIs (for AI Implantation)
OPENAI_API_KEY=sk-...          # GPT-4.1 for complex layouts
GEMINI_API_KEY=AIza...         # Gemini Flash for fast generation
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

### 🎨 Designer 2.0 (`/designer`) - UNIFIED INTERFACE

L'interface a été entièrement repensée pour une expérience unifiée :

**Vue 3D Full-Screen**
- Scène 3D Three.js immersive plein écran
- Pas de sidebar permanente - espace de travail maximisé
- Mesure entre objets intégrée
- Contrôles caméra (vue dessus, perspective, zoom)

**Library Drawer**
- Accès via bouton [+ ADD] ou [📦 LIBRARY]
- Catégories visuelles : Containers, Cooling, Transformers, PDU, Racks, Networking, Modules
- Cartes d'objets avec preview 3D miniature
- Clic = ajout direct à la scène (pas de "Select an object")
- Recherche intégrée

**Properties Panel Contextuel**
- Apparaît uniquement quand un objet est sélectionné
- Modification directe : position, rotation, couleur
- Actions : Duplicate, Delete, Lock, Hide
- Se ferme automatiquement quand on désélectionne

**Toolbar Flottante**
- Outils de transformation : Select, Move, Rotate, Scale
- Outil de mesure
- Contrôles de vue : Grid, Dimensions, Reset View, Top View
- Accès AI Implantation
- Save, Export, Open Project

**Workflow Simplifié**
```
AVANT: /objects → chercher → /designer → sidebar → ajouter → panel
APRÈS: /designer → [+ADD] → clic carte → objet sur scène → modifier direct
```

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

### Farm Designer (`/designer`) - UNIFIED 3D EDITOR
- **Full-screen 3D** Three.js visualization avec vue immersive
- **Library Drawer** avec catégories et cartes d'objets avec preview 3D
- **Clic = Ajout direct** - Pas de workflow complexe
- **Toolbar flottante** avec tous les outils essentiels
- **Properties Panel contextuel** pour édition rapide
- **Mesure intégrée** entre objets sur la scène
- **AI Implantation** - Génération automatique de layouts optimisés
- **Save/Load/Export** projets en JSON
- Infrastructure complète : Containers, Cooling, Transformers, PDU, Racks, Networking, Modules assemblés

### AI Implantation (GPT-4.1 & Gemini Flash)
- **Génération automatique** de layouts de ferme mining
- **Optimisation intelligente** (densité, refroidissement, maintenance)
- **Dual AI** : GPT-4.1 pour layouts complexes, Gemini Flash pour rapidité
- **Sélection auto** du meilleur modèle selon la complexité
- **Validation** des placements (collisions, limites, contraintes)
- **Recommandations** d'amélioration de layout
- **Statistiques** : puissance totale, slots machines, utilisation
- **AI Status Panel** : Affichage en temps réel de l'état des providers (GPT-4.1, Gemini)

### 🗄️ Cloud Storage (Supabase)
- **Sauvegarde en base de données** : Layouts persistants dans Supabase
- **Bouton "Save DB"** dans le header pour sauvegarde rapide
- **Cloud Panel** : Gestion des layouts (Open, Save, Delete)
- **Last Saved** : Affichage de la dernière sauvegarde
- **Multi-layouts** : Gestion de plusieurs projets
- **Import/Export** : Compatible JSON local + base de données

### ⌨️ Raccourcis Clavier Designer

| Catégorie | Touche | Action |
|-----------|--------|--------|
| **Navigation** | W / ↑ | Déplacer vers l'avant (Z-) |
| | S / ↓ | Déplacer vers l'arrière (Z+) |
| | A / ← | Déplacer à gauche (X-) |
| | D / → | Déplacer à droite (X+) |
| | Q | Descendre (Y-) |
| | E | Monter (Y+) |
| | PageUp | Monter (Y+) |
| | PageDown | Descendre (Y-) |
| | Shift | Mouvement fin (0.1m au lieu de 0.5m) |
| **Outils** | V | Outil sélection |
| | G | Outil déplacement |
| | R | Outil rotation |
| | M | Outil mesure |
| **Actions** | Delete / Backspace | Supprimer objet |
| | Ctrl+D | Dupliquer objet |
| | Escape | Désélectionner |
| | Ctrl+S | Sauvegarde rapide (localStorage) |
| **Vues** | 0 | Vue perspective |
| | 1 | Vue front |
| | 2 | Vue back |
| | 3 | Vue gauche |
| | 4 | Vue droite |
| | 5 | Vue dessus |
| | F | Plein écran |

### Contrôles Hauteur (Y-Axis)
- **Slider** de hauteur dans le panneau propriétés
- **Boutons Up/Down** pour ajustement rapide (+/- 0.5m)
- **Inputs éditables** pour position X, Y, Z précise
- **Protection sol** : Y ne peut pas être négatif

### 🧞 GENIE - Assistant IA Intégré

Le Genie est un assistant IA conversationnel intégré directement dans l'éditeur 3D.

#### Commandes Vocales/Texte
| Commande | Action |
|----------|--------|
| `"Ferme 5 MW"` | Génère automatiquement une ferme de 5 MW |
| `"Ajoute 4 containers"` | Ajoute 4 containers HD5 au layout |
| `"Ajoute 2 coolers"` | Ajoute 2 dry coolers EC2-DT |
| `"Analyse"` | Détecte tous les problèmes du layout |
| `"Fix"` | Corrige automatiquement tous les problèmes |
| `"Coût"` | Estime le budget total (équipement + installation) |
| `"Aligne"` | Aligne tous les objets sur la grille |
| `"Espace 2m"` | Applique un espacement de 2m entre objets |
| `"Aide"` | Affiche toutes les commandes disponibles |

#### Farm Presets
| Preset | Description |
|--------|-------------|
| 🏭 **Starter 1 MW** | 2 containers HD5 + 1 dry cooler + 1 transfo |
| ⚡ **Medium 5 MW** | 8 containers + 4 dry coolers + 2 transfos |
| 🔥 **Mega 20 MW** | 32 containers + 16 coolers + 8 transfos |
| 🏜️ **Qatar Optimized** | Layout optimisé climat chaud (+40°C) |
| 🏗️ **Site Complet 8 Containers** | **TOUT INCLUS** - Voir détails ci-dessous |

#### 🏗️ Preset "Site Complet 8 Containers" - Détails

Ce preset génère un site minier **professionnel clé en main** avec :

**Mining (8 containers)**
- 8× ANTSPACE HD5 (308 slots chacun = 2464 machines)
- 4× EC2-DT Dry Coolers (refroidissement hydro)

**Électricité**
- 3× Transformateurs 3.75 MVA
- 1× PDU Principal 5MW
- 2× PDU Secondaires
- 2× Gensets CAT 3516B 2MW (backup)
- 1× Fuel Tank 20,000L

**Eau & Refroidissement**
- 2× Water Tanks 50m³
- 2× Pompes de circulation
- 1× Water Treatment Unit
- 2× AHU (Air Handling Units)

**Sécurité**
- 1× Fire Suppression Tank
- 1× Fire Pump House
- 1× Security Cabin
- 1× Guard Tower

**Control & Network**
- 1× Control Room Container
- 1× Network POP Container
- 1× Satellite VSAT

**Logistique**
- 1× Spare Parts Container
- 1× Maintenance Workshop
- 1× Main Gate
- 1× Parking Zone
- 1× Loading Dock

**Électricité Avancée**
- 3× Cable Trays (HT/BT)
- 1× Raccordement HT Poste Source
- 1× Poste Livraison HTA
- 1× UPS 500kVA + Battery Bank

**Infrastructure Complète**
- 4× Clôtures Périmétriques (N/S/E/O)
- 6× Mâts Éclairage LED
- 4× Dalles Béton (fondations)
- 3× Tuyauteries Eau (froid/chaud/collecteur)
- 1× Station Météo
- 4× Caméras PTZ Surveillance
- 1× Compresseur Air Industriel

**Confort Personnel**
- 1× Bloc Sanitaire
- 1× Réfectoire Container

### 📋 Bill of Materials (BOM)

Le Genie génère automatiquement un BOM complet avec :
- **Catégorie** par type d'équipement
- **Quantité** comptée automatiquement
- **Prix unitaire** basé sur les fournisseurs réels
- **Total** par ligne
- **Fournisseur** suggéré (Bitmain, ABB, Caterpillar, etc.)
- **Délai de livraison** estimé

**Export disponible:**
- 📥 CSV (Excel compatible)
- 📄 JSON (intégration systèmes)

#### Auto-Detection & Fix
- ⚠️ Détection automatique manque de refroidissement
- ⚡ Détection insuffisance transformateurs
- 🚧 Détection violations de clearance
- 📐 Détection mauvais alignement
- 🔧 **Un clic pour tout corriger automatiquement**

#### Estimation Coûts
- 💰 Calcul automatique du coût des équipements
- 📊 Estimation installation (15% du matériel)
- 💵 Total projet en temps réel

### 🔌 Système de Câblage Intelligent

Le Designer intègre un système de câblage professionnel pour tracer les chemins de câbles électriques et data.

#### Snap Points par Équipement
Chaque équipement a des points de connexion prédéfinis :

| Équipement | Points de Connexion |
|------------|---------------------|
| **Container HD5** | Toit (4 points), Panneaux latéraux (2), Terre |
| **Cooling EC2-DT** | Alimentation ventilateurs, Contrôle, Bus data, Terre |
| **Transformateur** | Sortie HT, Sortie BT, Terre, Neutre, Contrôle |
| **PDU** | Entrée principale, Sorties circuits (3), Sortie toit, Terre, Monitoring |
| **Générateur** | Sortie puissance, Neutre, Contrôle démarrage, Terre |
| **Switchgear** | Entrée HT, Départs BT (3), Terre, Bus communication |

#### Types de Connexion (Couleurs)
| Type | Couleur | Usage |
|------|---------|-------|
| `power-ht` | 🔴 Rouge | Haute tension |
| `power-bt` | 🟠 Orange | Basse tension |
| `data` | 🔵 Bleu | Réseau data |
| `control` | 🟣 Violet | Câbles de contrôle |
| `earth` | 🟢 Vert | Mise à terre |

#### Système de Zones
- **Zone de passage** : Hauteur minimum 3m pour allées
- **Zone technique** : Hauteur selon équipement + clearance
- **Zone interdite** : Pas de câbles (sorties air chaud, radiateurs, accès maintenance)

#### Calcul Automatique de Hauteur
Le système calcule automatiquement la hauteur optimale des câbles selon :
- Hauteur des équipements traversés
- Clearance minimum (0.3m au-dessus des équipements)
- Points de connexion départ/arrivée
- Hauteur max configurable (6m par défaut)

#### Types de Chemins de Câbles
| Type | Largeur | Usage |
|------|---------|-------|
| **Ladder (Échelle)** | 300-600mm | Câbles de puissance |
| **Wire Mesh (Grillagé)** | 200mm | Câbles data/réseau |
| **Conduit** | 50mm | Câbles de contrôle individuels |
| **Busbar** | 100mm | Jeu de barres haute tension |

#### Raccourcis Câblage
| Touche | Action |
|--------|--------|
| P | Mode Tracer |
| V | Mode Sélection |
| S | Toggle Snap magnétique |
| G | Toggle Grille |
| Entrée | Terminer tracé |
| Échap | Annuler tracé |

### 3D Editor Pro Tools (DÉBRIDÉ)

#### Outils de Visualisation
| Outil | Description |
|-------|-------------|
| **Snap to Grid** | Accrochage magnétique à la grille (1-5m configurable) |
| **Airflow** | Visualise flux d'air chaud (rouge) et froid (bleu) |
| **Power Path** | Trace le chemin électrique (transfo → PDU → containers) |
| **Clearance Zones** | Affiche zones de sécurité et violations de distance |
| **Metrics Panel** | Métriques mining en temps réel (power, cooling ratio, slots) |

#### Outils d'Alignement & Distribution
| Outil | Description |
|-------|-------------|
| **Align Left/Center/Right** | Aligne objets sélectionnés sur X |
| **Align Top/Middle/Bottom** | Aligne objets sélectionnés sur Z |
| **Distribute H/V** | Espace équidistant (min 3 objets) |
| **Auto Spacing** | Espacement automatique (1.5m, 2m, 3m, 4m) pour allées maintenance |

#### Clone & Mirror
| Outil | Description |
|-------|-------------|
| **Array Clone** | Duplique en grille (rows × cols) avec espacement |
| **Mirror X/Z** | Symétrie horizontale/verticale |

#### Calculatrices Avancées
| Calcul | Description |
|--------|-------------|
| **Thermal** | BTU, CFM, tons of cooling, dew point, condensation risk |
| **Electrical** | Transfo sizing, courant, PDU count, section câbles |
| **PUE Estimate** | Estimation automatique du PUE selon type cooling |
| **Water Flow** | Débit eau m³/h pour hydro cooling |

#### Base de Données Équipements Intégrée
- **ASICs** : S21 XP Hydro (473 TH), S21 Pro (234 TH), M66S (298 TH), etc.
- **Containers** : ANTSPACE HK3 (210 slots), HD5 (308 slots), HD3 (144 slots)
- **Cooling** : EC2-DT (1500 kW), CDU-S1 (500 kW), Adiabatic
- **Transformers** : 3750 kVA, 2500 kVA, 1000 kVA avec specs complètes

#### Export Formats
- **JSON** : Export complet avec métriques
- **DXF** : Export CAD basique pour AutoCAD/DraftSight

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
- `controllers/aiController.js` - AI implantation endpoints
- `routes/objectRoutes.js` - Object API routes
- `routes/layoutRoutes.js` - Layout API routes
- `routes/aiRoutes.js` - AI API routes
- `services/aiService.js` - AI service (GPT-4.1 & Gemini Flash)

### Backend Middleware
- `middleware/authMiddleware.js` - JWT authentication & demo mode
- `middleware/validationMiddleware.js` - Input validation with express-validator
- `middleware/index.js` - Middleware exports

### Frontend Pages
- `app/designer/page.tsx` - **UNIFIED** 3D Designer (refonte complète v2.0)
- `app/calculator/page.tsx` - Profitability Calculator
- `app/monitoring/page.tsx` - Monitoring Dashboard
- `app/machines/page.tsx` - ASIC Machine Catalog

### Frontend Components - Designer 2.0 (New)
- `components/designer/library-drawer.tsx` - Drawer avec catégories et cartes preview
- `components/designer/object-card.tsx` - Carte objet avec preview 3D miniature
- `components/designer/properties-panel.tsx` - Panneau d'édition contextuel
- `components/designer/toolbar.tsx` - Barre d'outils flottante bottom
- `components/designer/object-3d-editor.tsx` - Composants 3D Three.js
- `components/designer/object-3d-preview.tsx` - Preview 3D pour cartes

### Frontend Components - Câblage Intelligent (New)
- `components/designer/cable-snap-points.ts` - Définitions snap points par type d'équipement
- `components/designer/cable-zone-manager.ts` - Gestion zones et calcul hauteurs automatiques
- `components/designer/cable-routing-tool.tsx` - Panneau UI de routage de câbles
- `components/designer/cable-3d-renderer.tsx` - Rendu 3D des chemins de câbles

### Frontend Components (Core)
- `components/ErrorBoundary.tsx` - React error boundary
- `components/ui/skeleton.tsx` - Loading skeleton components
- `hooks/useApi.ts` - Custom API hooks
- `types/index.ts` - Shared TypeScript types

### Frontend API (Updated)
- `lib/api.ts` - Added objectsApi, layoutsApi, and aiApi clients

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

Hearst Mining Architect v2.0.0 - 🎨 DESIGNER 2.0 (Interface unifiée full-screen, Library Drawer, Properties Panel)

---

## 🤖 PROMPT GPT - Mining Farm Designer

Copie ce prompt pour utiliser GPT comme assistant de design de fermes mining :

```
Tu es un expert en conception de fermes de mining Bitcoin. Tu as accès à un outil 3D appelé "Hearst Mining Architect" avec un assistant IA nommé "Genie".

### Contexte
- Je conçois des fermes de mining Bitcoin professionnelles
- J'utilise des containers ANTSPACE HD5 (308 machines, 12.2m × 2.9m × 2.4m, hydro cooling)
- Dry Coolers EC2-DT pour le refroidissement
- Transformateurs 3.75 MVA
- Site au Qatar (climat chaud +40°C, humidité 50%)

### Équipements Disponibles
| Type | Modèle | Specs | Prix USD |
|------|--------|-------|----------|
| Container Mining | ANTSPACE HD5 | 308 slots, 1765kW max, hydro | $180,000 |
| Container Mining | ANTSPACE HK3 | 210 slots, 1200kW max, air | $95,000 |
| Dry Cooler | EC2-DT | 1500kW capacity | $120,000 |
| Transformateur | 3.75 MVA | Oil-immersed | $85,000 |
| PDU | 5MW | Distribution principale | $65,000 |
| Genset | CAT 3516B | 2MW backup | $280,000 |
| Water Tank | 50m³ | Stockage eau | $25,000 |
| UPS | 500kVA | Backup électrique | $95,000 |

### Commandes Genie Disponibles
- "ajoute X containers" → Ajoute des HD5
- "ajoute X coolers" → Ajoute des EC2-DT
- "ajoute X transfos" → Ajoute des transformateurs
- "ferme X MW" → Génère une ferme de X MW
- "site complet" / "tout" / "8 containers" → Site pro clé en main
- "analyse" → Détecte les problèmes de layout
- "fix" → Corrige automatiquement
- "bom" / "devis" → Génère le Bill of Materials
- "coût" → Estimation budget total
- "aligne" → Aligne sur grille
- "espace Xm" → Espacement maintenance

### Règles de Dimensionnement
1. **Cooling** : 1 EC2-DT pour 2 containers max
2. **Électrique** : 1 Transfo 3.75MVA pour 3MW de charge
3. **Clearance** : 2m minimum entre équipements
4. **Maintenance** : Allées de 3m pour accès camion
5. **Water Flow** : Q = P / (1.16 × ΔT) m³/h
6. **PUE cible** : < 1.15 pour hydro cooling

### Calculs Thermiques
- Heat Load (kW) = Puissance IT × 1.05 (pertes)
- BTU/h = kW × 3412
- Tons of Cooling = kW / 3.517
- CFM = kW / (1.2 × ΔT) × 2118.88

### Ce que je veux
[DÉCRIS TON PROJET ICI]
- Nombre de containers souhaité
- Puissance totale cible
- Contraintes spécifiques (espace, budget, délai)
- Questions sur le dimensionnement

Réponds en français avec des recommandations techniques précises.
```

---
