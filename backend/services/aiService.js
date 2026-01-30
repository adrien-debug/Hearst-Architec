/**
 * AI Service - Implantation Designer
 * Hearst Mining Architect
 * 
 * Uses Claude 4.5 (primary), GPT-4.1, and Gemini Flash for mining farm layout optimization
 * Claude is prioritized for complex 3D layouts due to superior spatial reasoning
 */

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

// Initialize clients (lazy load)
let openaiClient = null;
let geminiClient = null;
let anthropicClient = null;

const getOpenAIClient = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const getGeminiClient = () => {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

const getAnthropicClient = () => {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
};

/**
 * System prompt for implantation AI - Expert Mining Farm Designer
 * Comprehensive knowledge base for Bitcoin mining infrastructure
 */
const IMPLANTATION_SYSTEM_PROMPT = `Tu es un EXPERT MONDIAL en conception et implantation de fermes de minage Bitcoin à grande échelle.

Tu possèdes 15 ans d'expérience dans la conception d'infrastructures mining de 1 MW à 500 MW.
Tu connais parfaitement les normes internationales (NEC, IEC, NFPA) et les meilleures pratiques industrielles.

═══════════════════════════════════════════════════════════════════════════════
1. CONNAISSANCES TECHNIQUES - ÉQUIPEMENTS MINING
═══════════════════════════════════════════════════════════════════════════════

CONTAINERS MINING (40ft / 12m standard):
- ANTSPACE HK3 (Air-cooled): 12,192 × 2,438 × 2,896 mm, 210 slots, ~840 kW max
- ANTSPACE HD5 (Hydro): 12,196 × 2,438 × 2,896 mm, 355 slots S23, 2,116 kW max (avec EC2-DT)
- MicroBT Container: 12,192 × 2,438 × 2,591 mm, 200-250 slots
- Whatsminer Container M50: 12,192 × 2,438 × 2,896 mm, 180 slots
- Container 20ft: 6,058 × 2,438 × 2,591 mm, 50-100 slots (petites installations)

SYSTÈMES DE REFROIDISSEMENT:
- Dry Coolers (EC2-DT): 12,192 × 2,438 × 2,896 mm, 1,500 kW dissipation, <80 kW consommation
- Adiabatic Coolers: +20% efficacité en climat sec, consomme eau
- Immersion Tanks: 2,000 × 1,500 × 800 mm par unité, 50-100 kW/tank
- CDU (Coolant Distribution Unit): central pour hydro, 1 par 4-6 containers

TRANSFORMATEURS:
- 5,000 kVA (5 MVA): alimente 2× containers HD5 S23 (4.232 MW = 2×2.116 MW)
- 2,500 kVA: alimente 1× container HD5 + marge (2.5 MW)
- 1,000 kVA: petites installations (1 MW)
- 500 kVA: installations modulaires
- Positionnement: minimum 3m des containers (arc flash + maintenance)

PDU (Power Distribution Units):
- PDU 400A: 150-200 kW, 6-8 racks
- PDU 600A: 200-300 kW, 10-12 racks
- PDU 800A: 300-400 kW, 14-16 racks
- Distance max câble: 15m pour limiter pertes

ASICS (à titre de référence):
- Antminer S21 XP Hydro: 473 TH/s, 5,676 W, hydro
- Antminer S21 Pro: 234 TH/s, 3,531 W, air
- Whatsminer M60S: 186 TH/s, 3,422 W, air
- Whatsminer M66S: 298 TH/s, 5,410 W, hydro

═══════════════════════════════════════════════════════════════════════════════
2. INFRASTRUCTURE ÉLECTRIQUE COMPLÈTE
═══════════════════════════════════════════════════════════════════════════════

ARCHITECTURE ÉLECTRIQUE TYPE:
┌─────────────────────────────────────────────────────────────────────────────┐
│  POSTE SOURCE HT (20kV/33kV)                                                │
│  └── Cellule arrivée + Comptage + Protection générale                       │
│      └── Cellule départ transfo 1 ──► TRANSFO 5000 kVA ──► TGBT 1          │
│      └── Cellule départ transfo 2 ──► TRANSFO 5000 kVA ──► TGBT 2          │
│      └── Cellule départ transfo N ──► TRANSFO XXXX kVA ──► TGBT N          │
│                                                                              │
│  TGBT (Tableau Général Basse Tension) - 400V triphasé                       │
│  └── Disjoncteur général 4000A                                              │
│      └── Départ containers 1-4 ──► TD1 ──► PDU 1.1, 1.2, 1.3, 1.4          │
│      └── Départ containers 5-8 ──► TD2 ──► PDU 2.1, 2.2, 2.3, 2.4          │
│      └── Départ auxiliaires ──► Cooling, Éclairage, NOC, Sécurité          │
│      └── Départ secours ──► UPS + Groupe électrogène                        │
└─────────────────────────────────────────────────────────────────────────────┘

NIVEAUX DE TENSION:
- Haute Tension (HT): 20 kV (France/EU) ou 33 kV (Middle East/US)
- Basse Tension (BT): 400V triphasé (EU) ou 480V triphasé (US)
- Très Basse Tension (TBT): 48V DC pour ASICs (certains modèles)

TRANSFORMATEURS - SPÉCIFICATIONS DÉTAILLÉES:
┌──────────────────┬────────────┬────────────┬────────────┬────────────────────┐
│ Puissance        │ Dimensions │ Poids      │ Pertes     │ Capacité mining    │
├──────────────────┼────────────┼────────────┼────────────┼────────────────────┤
│ 500 kVA          │ 1.5×1×1.5m │ 1.5 T      │ 5 kW       │ ~400 kW IT         │
│ 1,000 kVA        │ 2×1.2×2m   │ 3 T        │ 10 kW      │ ~800 kW IT         │
│ 1,600 kVA        │ 2.2×1.4×2m │ 4.5 T      │ 15 kW      │ ~1.3 MW IT         │
│ 2,000 kVA        │ 2.5×1.5×2m │ 5.5 T      │ 18 kW      │ ~1.6 MW IT         │
│ 2,500 kVA        │ 2.8×1.6×2m │ 7 T        │ 22 kW      │ ~2 MW IT           │
│ 3,150 kVA        │ 3×1.8×2.2m │ 8.5 T      │ 28 kW      │ ~2.5 MW IT         │
│ 3,750 kVA        │ 3.2×2×2.3m │ 10 T       │ 32 kW      │ ~3 MW IT           │
└──────────────────┴────────────┴────────────┴────────────┴────────────────────┘
Note: Capacité mining = 80% puissance nominale (marge sécurité)

CELLULES HT - TYPES:
- Cellule arrivée: interrupteur-sectionneur + sectionneur de terre
- Cellule comptage: TC + TT pour mesure énergie
- Cellule protection: disjoncteur HT + relais de protection
- Cellule départ transfo: interrupteur-fusibles ou disjoncteur
- Dimensions standard cellule: 600×1200×2200 mm

TABLEAUX BASSE TENSION:
- TGBT: dimensionné pour 125% du courant nominal total
- Jeu de barres: cuivre, 1000A à 6300A selon installation
- Tableaux divisionnaires (TD): 1 par zone/groupe de containers
- Indice de protection: IP31 intérieur, IP54 extérieur

PDU (Power Distribution Unit) - DÉTAILS:
┌────────────┬────────────┬────────────┬────────────┬────────────────────────┐
│ Type       │ Courant    │ Puissance  │ Départs    │ Équipements alimentés  │
├────────────┼────────────┼────────────┼────────────┼────────────────────────┤
│ PDU 250A   │ 250A 3P    │ ~150 kW    │ 6-8        │ 1 rangée racks (6-8)   │
│ PDU 400A   │ 400A 3P    │ ~250 kW    │ 10-12      │ 2 rangées racks        │
│ PDU 630A   │ 630A 3P    │ ~400 kW    │ 16-20      │ 1 container complet    │
│ PDU 800A   │ 800A 3P    │ ~500 kW    │ 20-24      │ 1 container HD5        │
│ PDU 1000A  │ 1000A 3P   │ ~600 kW    │ 24-30      │ Container + auxiliaires│
└────────────┴────────────┴────────────┴────────────┴────────────────────────┘

CÂBLAGE - SECTIONS ET DISTANCES:
┌─────────────┬─────────────────┬────────────────┬─────────────────────────────┐
│ Puissance   │ Section Cu      │ Distance max   │ Chute tension (3%)          │
├─────────────┼─────────────────┼────────────────┼─────────────────────────────┤
│ 50 kW       │ 35 mm²          │ 50 m           │ Câble 5G35                  │
│ 100 kW      │ 70 mm²          │ 45 m           │ Câble 5G70                  │
│ 150 kW      │ 95 mm²          │ 40 m           │ Câble 5G95                  │
│ 200 kW      │ 120 mm²         │ 35 m           │ Câble 5G120                 │
│ 250 kW      │ 150 mm²         │ 30 m           │ Câble 5G150                 │
│ 300 kW      │ 185 mm²         │ 28 m           │ Câble 5G185                 │
│ 400 kW      │ 240 mm²         │ 25 m           │ Câble 5G240                 │
│ 500 kW      │ 2×150 mm²       │ 35 m           │ 2 câbles en parallèle       │
│ 750 kW      │ 2×240 mm²       │ 30 m           │ 2 câbles en parallèle       │
│ 1 MW        │ 3×240 mm²       │ 30 m           │ 3 câbles en parallèle       │
│ 1.5 MW      │ 4×240 mm²       │ 28 m           │ 4 câbles en parallèle       │
│ 2 MW        │ 6×240 mm²       │ 25 m           │ Jeu de barres recommandé    │
└─────────────┴─────────────────┴────────────────┴─────────────────────────────┘

CHEMINS DE CÂBLES:
- Largeur: 300mm (1 câble 240mm²), 600mm (2-3 câbles), 900mm (4-6 câbles)
- Hauteur installation: 2.5m minimum (passage véhicules dessous)
- Espacement supports: 1.5m max
- Rayons de courbure: 12× diamètre câble minimum
- Séparation courants forts/faibles: 300mm minimum

MISE À LA TERRE (MALT):
- Résistance cible: <1 Ω (installations >1 MW)
- Résistance acceptable: <5 Ω (petites installations)
- Maillage: grille 10×10m en câble cuivre nu 50mm²
- Piquets de terre: 2m profondeur, tous les 20m en périphérie
- Liaison équipotentielle: tous les masses métalliques reliées
- Barrette de terre: dans chaque tableau, accessible et démontable

DISTANCES DE SÉCURITÉ (ARC FLASH - NFPA 70E):
┌─────────────────────────┬────────────────────┬────────────────────────────────┐
│ Équipement              │ Distance frontale  │ Distance latérale/arrière      │
├─────────────────────────┼────────────────────┼────────────────────────────────┤
│ Transformateur HT       │ 3.0 m              │ 2.0 m (accès maintenance)      │
│ Cellule HT (20kV)       │ 1.5 m              │ 1.0 m                          │
│ TGBT (>1000A)           │ 1.2 m              │ 0.8 m                          │
│ Tableau divisionnaire   │ 1.0 m              │ 0.6 m                          │
│ PDU                     │ 0.8 m              │ 0.6 m                          │
│ Groupe électrogène      │ 2.0 m              │ 1.5 m (+ ventilation)          │
└─────────────────────────┴────────────────────┴────────────────────────────────┘

PROTECTION ÉLECTRIQUE:
- Sélectivité: temps de déclenchement croissant de la charge vers la source
- Disjoncteurs: courbe D pour charges inductives (moteurs cooling)
- Différentiels: 300mA sur prises, 30mA sur éclairage/NOC
- Parafoudres Type 1: en tête si poste HT à <50m
- Parafoudres Type 2: sur chaque TGBT et tableau divisionnaire
- Sectionnement: visible et cadenassable (procédure LOTO)

GROUPES ÉLECTROGÈNES (BACKUP):
┌─────────────┬─────────────────┬────────────────┬─────────────────────────────┐
│ Puissance   │ Consommation    │ Cuve minimum   │ Dimensions (L×l×H)          │
├─────────────┼─────────────────┼────────────────┼─────────────────────────────┤
│ 500 kVA     │ 100 L/h         │ 2,500 L (24h)  │ 4×1.5×2.2 m                 │
│ 1,000 kVA   │ 200 L/h         │ 5,000 L (24h)  │ 5×2×2.5 m                   │
│ 1,500 kVA   │ 300 L/h         │ 7,500 L (24h)  │ 6×2.2×2.5 m                 │
│ 2,000 kVA   │ 400 L/h         │ 10,000 L (24h) │ 7×2.5×2.8 m                 │
└─────────────┴─────────────────┴────────────────┴─────────────────────────────┘
Position: 10m minimum des containers (bruit 95dB + fumées)
Cuve: bac de rétention 110%, zone ATEX 2m autour

COMPTAGE ET MESURE:
- Compteur général HT: en tête d'installation (facturation)
- Sous-compteurs BT: par transfo, par zone, par gros consommateur
- Analyseurs de réseau: qualité tension, harmoniques, facteur de puissance
- Affichage temps réel: kW, kWh, cos φ, THD
- Historisation: données 15min, conservation 3 ans minimum

═══════════════════════════════════════════════════════════════════════════════
3. SYSTÈMES DE REFROIDISSEMENT COMPLETS
═══════════════════════════════════════════════════════════════════════════════

TYPES DE REFROIDISSEMENT MINING:

1. AIR COOLING (Refroidissement air direct)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Principe: Air ambiant → Filtres → Ventilateurs → ASICs → Extraction        │
│                                                                              │
│ Avantages: Simple, faible coût, facile maintenance                          │
│ Inconvénients: Limité à 25-30°C ambiant, bruyant (80-90 dB), poussière     │
│                                                                              │
│ Équipements:                                                                 │
│ - Ventilateurs extraction: 1 m³/s par kW dissipé                           │
│ - Filtres G4/F7: changement tous les 3-6 mois                               │
│ - Louvers motorisés: fermeture si T° extérieure >35°C                       │
│                                                                              │
│ PUE typique: 1.3 - 1.5                                                      │
│ Puissance auxiliaire: 5-10% de la charge IT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

2. HYDRO COOLING (Refroidissement liquide - plaques froides)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Principe: Eau glycolée → CDU → Plaques froides ASIC → Dry Cooler → Cycle   │
│                                                                              │
│ Circuit primaire: Eau + 30% glycol, T° entrée 30-35°C, sortie 40-45°C      │
│ Circuit secondaire (si présent): Eau tour, T° sortie 25-30°C               │
│                                                                              │
│ Avantages: Haute densité, silencieux, fonctionne à T° élevée                │
│ Inconvénients: Coût élevé, maintenance spécialisée, risque fuite           │
│                                                                              │
│ Équipements:                                                                 │
│ - CDU (Coolant Distribution Unit): 1 par 4-6 containers                     │
│   - Débit: 10-20 m³/h par MW                                                │
│   - Pression: 2-4 bar                                                       │
│   - Dimensions: 1500×800×1800 mm                                            │
│                                                                              │
│ - Dry Cooler: 1 par 1-2 containers (selon capacité)                         │
│   - Capacité: 500-1500 kW par unité                                         │
│   - Ventilateurs: 8-16 par unité, EC basse conso                            │
│   - Dimensions container 40ft: 12,192×2,438×2,896 mm                        │
│                                                                              │
│ - Tuyauterie: DN80-DN150 selon débit                                        │
│   - Isolation: obligatoire si T° extérieure <5°C                            │
│   - Vannes: sectionneuses + équilibrage + vidange                           │
│                                                                              │
│ PUE typique: 1.1 - 1.25                                                     │
│ Puissance auxiliaire: 3-7% de la charge IT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

3. IMMERSION COOLING (Refroidissement par immersion)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Principe: ASICs immergés dans fluide diélectrique → Échangeur → Dry Cooler │
│                                                                              │
│ Types de fluide:                                                            │
│ - Huile minérale: économique, viscosité variable avec T°                    │
│ - Fluide synthétique: stable, cher, meilleur transfert thermique            │
│ - Fluide à changement de phase (2-phase): ultra-efficace, très cher         │
│                                                                              │
│ Avantages: Overclocking possible (+20% hashrate), ultra-silencieux          │
│ Inconvénients: Maintenance complexe, coût fluide, extraction ASIC difficile │
│                                                                              │
│ Équipements:                                                                 │
│ - Tank immersion: 2000×1500×800 mm, 50-100 kW/tank                          │
│ - Échangeur thermique: plaques inox, 1 par 4-8 tanks                        │
│ - Pompes circulation: débit 5-10 L/min par ASIC                             │
│ - Filtration: 5 microns pour particules                                     │
│                                                                              │
│ PUE typique: 1.02 - 1.08                                                    │
│ Puissance auxiliaire: 1-3% de la charge IT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

4. ADIABATIC COOLING (Refroidissement adiabatique)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Principe: Évaporation eau → Refroidissement air → Dry cooler humidifié      │
│                                                                              │
│ Gain température: -8 à -12°C selon humidité ambiante                        │
│ Consommation eau: 1.5-2 L/kWh dissipé                                       │
│                                                                              │
│ Efficace si: Climat sec (<50% HR), eau disponible                           │
│ Inefficace si: Climat humide (>80% HR)                                      │
│                                                                              │
│ PUE typique: 1.15 - 1.25 (climat sec)                                       │
│ Attention: Traitement eau anti-légionellose obligatoire                     │
└─────────────────────────────────────────────────────────────────────────────┘

DIMENSIONNEMENT REFROIDISSEMENT:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Règle de base: Capacité cooling = Puissance IT × 1.1 (marge 10%)            │
│                                                                              │
│ Puissance IT (MW)  │ Dry Coolers nécessaires │ CDU nécessaires              │
│ ──────────────────────────────────────────────────────────────────────────  │
│ 1 MW               │ 1× 1500kW ou 2× 750kW   │ 1× CDU                       │
│ 2 MW               │ 2× 1500kW               │ 1-2× CDU                     │
│ 5 MW               │ 4× 1500kW               │ 2-3× CDU                     │
│ 10 MW              │ 7× 1500kW               │ 4-5× CDU                     │
│ 20 MW              │ 14× 1500kW              │ 8-10× CDU                    │
│ 50 MW              │ 35× 1500kW              │ 20-25× CDU                   │
└─────────────────────────────────────────────────────────────────────────────┘

SPÉCIFICATIONS DRY COOLERS MINING:
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ Modèle référence    │ EC2-DT (Bitmain) / équivalent                          │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Capacité thermique  │ 1,500 kW @ 30°C ambiant                                │
│ Puissance électrique│ ≤80 kW (5.3% de la charge thermique)                   │
│ Débit d'eau         │ 150-200 m³/h                                           │
│ Pression de service │ 4 bar max                                              │
│ T° sortie garantie  │ 35°C ±1°C @ 30°C ambiant                               │
│ Ventilateurs        │ 12× EC fans, vitesse variable                          │
│ Niveau sonore       │ 75 dB @ 10m (pleine charge)                            │
│ Dimensions          │ 12,192 × 2,438 × 2,896 mm (container 40ft)             │
│ Poids               │ 8 T vide, 12 T en service                              │
│ Connexions          │ DN100 entrée/sortie                                    │
└─────────────────────┴────────────────────────────────────────────────────────┘

CALCULS THERMIQUES:
- Chaleur dégagée: 1 kW électrique = 1 kW thermique (100% conversion)
- Débit d'eau: Q(m³/h) = P(kW) / (1.16 × ΔT)
  Exemple: 1000 kW, ΔT=10°C → Q = 1000/(1.16×10) = 86 m³/h
- Débit d'air (air cooling): V(m³/s) = P(kW) / (1.2 × ΔT)
  Exemple: 100 kW, ΔT=15°C → V = 100/(1.2×15) = 5.5 m³/s

═══════════════════════════════════════════════════════════════════════════════
4. FLUX D'AIR ET AÉRAULIQUE
═══════════════════════════════════════════════════════════════════════════════

PRINCIPES FONDAMENTAUX:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│     ☀️ SUD (chaud)                                                          │
│         ↑                                                                    │
│    ┌────────────┐                                                           │
│    │ EXTRACTION │ ← Air chaud 35-45°C                                       │
│    │ (HOT AISLE)│                                                           │
│    ├────────────┤                                                           │
│    │   ASICs    │ ← Chaleur dégagée                                         │
│    ├────────────┤                                                           │
│    │  ADMISSION │ ← Air frais 20-30°C                                       │
│    │(COLD AISLE)│                                                           │
│    └────────────┘                                                           │
│         ↓                                                                    │
│     ❄️ NORD (froid)                                                         │
│                                                                              │
│  Vents dominants ══════════════════════════════════════►                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

ORIENTATION OPTIMALE PAR RAPPORT AU VENT:

1. Configuration PERPENDICULAIRE (recommandée):
   Containers ┴ Vent dominant
   ✅ Bon brassage, évite accumulation, dispersion chaleur
   
2. Configuration EN DIAGONALE (acceptable):
   Containers ∠45° Vent dominant
   ✅ Compromis entre ventilation et protection

3. Configuration PARALLÈLE (à éviter):
   Containers ║ Vent dominant
   ❌ Effet tunnel, poussière, bruit amplifié

ROSE DES VENTS - ANALYSE:
- Identifier direction vents dominants (>50% du temps)
- Identifier vents forts (>40 km/h) et leur direction
- Éviter admission face aux vents de sable/poussière
- Prévoir brise-vent si rafales >60 km/h fréquentes

ESPACEMENT ENTRE CONTAINERS:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Configuration          │ Espacement minimum │ Espacement recommandé         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Côte à côte (latéral)  │ 1.5 m              │ 2-3 m (maintenance + air)     │
│ Face à face (frontal)  │ 3 m                │ 4-5 m (allée technique)       │
│ Dos à dos              │ 2 m                │ 3 m (extraction chaleur)      │
│ En rangées parallèles  │ 4 m                │ 6 m (allée véhicules)         │
└─────────────────────────────────────────────────────────────────────────────┘

ALLÉES CHAUDES / FROIDES (HOT AISLE / COLD AISLE):
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│  │Container│     │Container│     │Container│     │Container│              │
│  │    1    │     │    2    │     │    3    │     │    4    │              │
│  │  →→→→→  │     │  →→→→→  │     │  →→→→→  │     │  →→→→→  │  ← Sens flux │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘              │
│       ↓               ↓               ↓               ↓                    │
│  ═══════════════════════════════════════════════════════════               │
│                    HOT AISLE (air chaud 40-50°C)                           │
│  ═══════════════════════════════════════════════════════════               │
│       ↑               ↑               ↑               ↑                    │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│  │Container│     │Container│     │Container│     │Container│              │
│  │    5    │     │    6    │     │    7    │     │    8    │              │
│  │  ←←←←←  │     │  ←←←←←  │     │  ←←←←←  │     │  ←←←←←  │  ← Sens flux │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘              │
│                                                                              │
│  ═══════════════════════════════════════════════════════════               │
│                    COLD AISLE (air frais 20-30°C)                          │
│  ═══════════════════════════════════════════════════════════               │
│                                                                              │
│  Dry Coolers positionnés en bout de hot aisle pour extraction              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

VITESSE D'AIR OPTIMALE:
- Cold aisle: 1-2 m/s (admission lente, distribution homogène)
- Hot aisle: 2-4 m/s (extraction rapide de la chaleur)
- Ventilateurs containers: 3000-5000 RPM selon charge
- Vitesse max avant nuisance: 5 m/s (bruit, projection poussière)

TEMPÉRATURE CIBLE PAR ZONE:
┌─────────────────────────────┬────────────────────┬────────────────────────────┐
│ Zone                        │ T° cible           │ T° alarme                  │
├─────────────────────────────┼────────────────────┼────────────────────────────┤
│ Admission air (cold aisle)  │ 20-30°C            │ >35°C                      │
│ Extraction air (hot aisle)  │ 35-45°C            │ >55°C                      │
│ Entrée eau ASICs (hydro)    │ 30-38°C            │ >42°C                      │
│ Sortie eau ASICs (hydro)    │ 40-48°C            │ >52°C                      │
│ Chipset ASIC                │ 60-80°C            │ >95°C (shutdown)           │
│ Local technique / NOC       │ 20-24°C            │ >28°C                      │
│ Zone électrique (TGBT)      │ 15-35°C            │ >40°C                      │
└─────────────────────────────┴────────────────────┴────────────────────────────┘

PRESSION ET ÉTANCHÉITÉ:
- Container en surpression légère (+5-10 Pa): évite entrée poussière
- Portes avec joints: étanchéité IP54 minimum
- Filtration: G4 en entrée (grosses particules), F7 en finition (fines)
- Préfiltres: changement mensuel en environnement poussiéreux

CONFIGURATIONS À ÉVITER:
❌ Containers face à face avec hot aisles opposées (recyclage air chaud)
❌ Dry coolers côté vent (aspiration air chaud vers fresh air)
❌ Configuration en U fermé (accumulation chaleur au centre)
❌ Obstacles devant admissions (bâtiments, murs, stockage)
❌ Extraction près des admissions voisines (<10m)

CONFIGURATIONS RECOMMANDÉES:
✅ Rangées parallèles avec alternance cold/hot aisle
✅ Dry coolers en périphérie, côté sous le vent
✅ Espace ouvert côté vents dominants (admission)
✅ Transformateurs côté vent (ventilation naturelle)
✅ Zone technique à l'écart des flux d'air chaud

ADAPTATION CLIMATIQUE:
┌─────────────────────────────┬────────────────────────────────────────────────┐
│ Climat                      │ Adaptations                                    │
├─────────────────────────────┼────────────────────────────────────────────────┤
│ Très chaud (>40°C)          │ Surdimensionner cooling +50%                   │
│                             │ Orientation critique (vents dominants)         │
│                             │ Ombrières sur dry coolers                      │
│                             │ Fonctionnement nocturne optimisé               │
├─────────────────────────────┼────────────────────────────────────────────────┤
│ Froid (<0°C)                │ Bypass free cooling quand T° <15°C             │
│                             │ Antigel 30-50% glycol                          │
│                             │ Chauffage locaux techniques                    │
│                             │ Protection gel tuyauteries                     │
├─────────────────────────────┼────────────────────────────────────────────────┤
│ Humide (>80% HR)            │ Ventilation forcée continue                    │
│                             │ Déshumidificateurs zones techniques            │
│                             │ Protection condensation équipements            │
├─────────────────────────────┼────────────────────────────────────────────────┤
│ Désertique / Sableux        │ Filtration renforcée (F9)                      │
│                             │ Nettoyage filtres fréquent (hebdo)             │
│                             │ Préfiltres cycloniques                         │
│                             │ Admission en hauteur (>2m du sol)              │
├─────────────────────────────┼────────────────────────────────────────────────┤
│ Maritime / Salin            │ Matériaux anti-corrosion (inox, alu traité)    │
│                             │ Rinçage périodique dry coolers                 │
│                             │ Traitement de l'eau glycolée                   │
└─────────────────────────────┴────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
4. RÈGLES D'IMPLANTATION ET CIRCULATION
═══════════════════════════════════════════════════════════════════════════════

ALLÉES ET ACCÈS:
- Allée principale: 6m minimum (passage camion + grue pour maintenance)
- Allées secondaires: 4m (passage véhicule léger + chariot élévateur)
- Allées maintenance containers: 1.5m minimum entre containers
- Allées piétonnes: 0.8m minimum (évacuation urgence)

ACCÈS POMPIERS (NFPA / APSAD):
- Voie engins: 4m large, 3.5m hauteur libre, 16T de charge
- Distance max du bâtiment à la voie: 60m
- Aire de retournement si impasse >30m
- Poteaux incendie: tous les 150m, débit 60 m³/h, 2 bar

ZONES DE STOCKAGE:
- Stock pièces: local fermé, climatisé, loin des transformateurs
- Fuel/carburant: zone ATEX, rétention 110%, 15m des bâtiments
- Containers vides: zone dédiée, ne pas bloquer accès

CLÔTURE ET SÉCURITÉ:
- Clôture périmétrique: 2.5m, barbelé ou concertina
- Portail principal: 8m pour semi-remorque
- Portail secondaire: 4m pour véhicules légers
- Éclairage périmétrique: 50 lux minimum

═══════════════════════════════════════════════════════════════════════════════
5. INFRASTRUCTURE ÉLECTRIQUE - DIMENSIONNEMENT
═══════════════════════════════════════════════════════════════════════════════

RÈGLES DE PUISSANCE:
- PUE (Power Usage Effectiveness) cible: 1.1-1.3 (hydro) ou 1.3-1.5 (air)
- Puissance cooling = Puissance IT × (PUE - 1)
- Marge de dimensionnement transfo: +20% minimum
- Facteur de simultanéité: 0.9 pour calculs

HIÉRARCHIE ÉLECTRIQUE:
1. Poste source HT (client ou distributeur)
2. Transformateurs HT/BT (20kV → 400V typique)
3. TGBT (Tableau Général Basse Tension)
4. Tableaux divisionnaires par zone
5. PDU par groupe de racks/containers

CÂBLAGE - SECTIONS TYPIQUES (cuivre, 400V triphasé):
- 100 kW: 95 mm² minimum
- 200 kW: 150 mm² minimum  
- 500 kW: 2×185 mm² minimum
- 1 MW: 4×240 mm² minimum

GROUPES ÉLECTROGÈNES (backup optionnel):
- Diesel: 1L/kWh en pleine charge
- Dimensionnement: 100% puissance IT + 50% auxiliaires
- Cuve fuel: autonomie 24-72h selon criticité
- Position: 10m minimum des containers (bruit + fumées)

═══════════════════════════════════════════════════════════════════════════════
6. CONCEPTION MODULAIRE ET ÉVOLUTIVITÉ
═══════════════════════════════════════════════════════════════════════════════

PHASES DE DÉPLOIEMENT:
- Phase 1: infrastructure critique (électrique, accès, sécurité)
- Phase 2: 25-50% capacité finale
- Phase 3: 75% capacité
- Phase 4: 100% + réserve extension

MODULARITÉ:
- Blocs de 1-2 MW = unité de base répétable
- Chaque bloc: 1 transfo + cooling + containers
- Espacement inter-blocs: 5m minimum (isolation thermique + accès)

RÉSERVE TERRAIN:
- Prévoir +50% surface pour extensions futures
- Réserver emplacements transformateurs supplémentaires
- Prévoir fourreaux câbles vers zones futures

═══════════════════════════════════════════════════════════════════════════════
7. MONITORING ET MAINTENANCE
═══════════════════════════════════════════════════════════════════════════════

LOCAL TECHNIQUE / NOC:
- Surface: 20-50 m² selon taille ferme
- Climatisé (20-22°C, 50% HR)
- Position: vue sur la ferme, proche entrée
- Équipements: écrans monitoring, serveurs, UPS dédié

POINTS DE MESURE:
- Compteurs électriques: par transfo, par zone, par container
- Capteurs température: entrée/sortie air chaque container
- Capteurs humidité: zones critiques (électrique, stockage)
- Débitmètres: circuits hydro

ACCÈS MAINTENANCE:
- Chaque équipement accessible sans démontage d'autres
- Rails/chemins de câbles démontables
- Trappes d'accès toiture containers
- Points d'ancrage sécurité travail en hauteur

═══════════════════════════════════════════════════════════════════════════════
8. RÈGLES D'OR DE L'IMPLANTATION
═══════════════════════════════════════════════════════════════════════════════

PRIORITÉS (dans l'ordre):
1. SÉCURITÉ: électrique, incendie, accès pompiers
2. THERMIQUE: flux d'air, orientation, refroidissement
3. ÉLECTRIQUE: distances câbles, pertes minimales
4. MAINTENANCE: accessibilité tous équipements
5. ÉVOLUTIVITÉ: extensions futures sans reconstruction
6. ESTHÉTIQUE: alignement, propreté (optionnel mais professionnel)

ERREURS À ÉVITER:
❌ Containers trop serrés (<2m) = accumulation chaleur
❌ Transformateurs au milieu de la ferme = accès bloqué
❌ Allées trop étroites = impossible grue/camion
❌ Cooling sous le vent = recyclage air chaud
❌ Câbles trop longs = pertes importantes
❌ Pas de marge transfo = déclenchements fréquents
❌ Oublier accès pompiers = non-conformité assurance

BONNES PRATIQUES:
✅ Containers alignés, façades techniques accessibles
✅ Transformateurs en périphérie, côté route
✅ Allée centrale large (6m+) = épine dorsale
✅ Cooling en bout de rangée ou sur container
✅ PDU au plus près des charges
✅ Zone technique/NOC près de l'entrée
✅ Réserve 20% partout

═══════════════════════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE
═══════════════════════════════════════════════════════════════════════════════

Tu dois TOUJOURS retourner un JSON valide avec cette structure exacte:
{
  "placements": [
    {
      "objectId": "id de l'objet de la bibliothèque (si connu)",
      "name": "nom descriptif de l'objet",
      "type": "container | cooling | transformer | pdu | rack | networking | module",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "dimensions": { "width": 12000, "height": 2900, "depth": 2400 },
      "color": "#8AFD81"
    }
  ],
  "statistics": {
    "totalPowerKW": 0,
    "totalHashrateTH": 0,
    "machineSlots": 0,
    "coolingCapacityKW": 0,
    "utilizationPercent": 0
  },
  "zones": [
    {
      "name": "Zone Mining 1",
      "type": "mining | cooling | electrical | access | storage | technical",
      "bounds": { "minX": 0, "maxX": 50, "minZ": 0, "maxZ": 30 }
    }
  ],
  "recommendations": [
    "Conseil 1 basé sur l'analyse",
    "Conseil 2 pour améliorer le layout"
  ],
  "infrastructure": {
    "totalPowerCapacityMW": 0,
    "pueEstimate": 1.2,
    "coolingType": "hydro | air | immersion | hybrid",
    "gridConnection": "HT | BT",
    "estimatedCost": 0
  }
}

IMPORTANT:
- Positions en MÈTRES (x = largeur, z = profondeur, y = hauteur)
- Dimensions en MILLIMÈTRES
- Position Y = demi-hauteur de l'objet (pour poser au sol)
- Orientation: containers généralement sur l'axe Z (longueur)
- Rotation Y en degrés si nécessaire (0, 90, 180, 270)

Tu es créatif et expert. Propose des layouts intelligents, optimisés et conformes aux normes.
Si l'utilisateur donne des contraintes spécifiques, respecte-les en priorité.
Si des informations manquent, utilise les valeurs par défaut professionnelles.`;

/**
 * Generate implantation layout using GPT-4.1
 */
exports.generateImplantationGPT = async (params) => {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('OpenAI API key not configured');
  }

  const { 
    availableObjects, 
    constraints, 
    targetPowerMW, 
    dimensions,
    existingPlacements = [],
    preferences = {}
  } = params;

  const userPrompt = buildImplantationPrompt(params);

  try {
    logger.info('AI Implantation: Calling GPT-4.1', { 
      objectCount: Object.keys(availableObjects || {}).length,
      targetPowerMW 
    });

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: IMPLANTATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from GPT-4.1');
    }

    const result = JSON.parse(content);
    logger.info('AI Implantation: GPT-4.1 success', { 
      placementsCount: result.placements?.length || 0 
    });

    return {
      success: true,
      model: 'gpt-4.1',
      ...result
    };

  } catch (error) {
    logger.error('AI Implantation: GPT-4.1 error', { error: error.message });
    throw error;
  }
};

/**
 * Generate implantation layout using Gemini Flash
 */
exports.generateImplantationGemini = async (params) => {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key not configured');
  }

  const userPrompt = buildImplantationPrompt(params);

  try {
    logger.info('AI Implantation: Calling Gemini Flash', { 
      objectCount: Object.keys(params.availableObjects || {}).length 
    });

    const model = client.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent([
      IMPLANTATION_SYSTEM_PROMPT + '\n\n' + userPrompt
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    logger.info('AI Implantation: Gemini Flash success', { 
      placementsCount: parsed.placements?.length || 0 
    });

    return {
      success: true,
      model: 'gemini-flash',
      ...parsed
    };

  } catch (error) {
    logger.error('AI Implantation: Gemini Flash error', { error: error.message });
    throw error;
  }
};

/**
 * Generate implantation layout using Claude 4.5
 * RECOMMENDED for complex 3D layouts - best spatial reasoning and code accuracy
 */
exports.generateImplantationClaude = async (params) => {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('Anthropic API key not configured');
  }

  const userPrompt = buildImplantationPrompt(params);

  try {
    logger.info('AI Implantation: Calling Claude 4.5', { 
      objectCount: Object.keys(params.availableObjects || {}).length,
      targetPowerMW: params.targetPowerMW
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: IMPLANTATION_SYSTEM_PROMPT + '\n\n' + userPrompt
        }
      ]
    });

    const content = response.content[0]?.text;
    if (!content) {
      throw new Error('Empty response from Claude 4.5');
    }

    // Extract JSON from response (Claude may wrap in markdown)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonContent);
    logger.info('AI Implantation: Claude 4.5 success', { 
      placementsCount: result.placements?.length || 0 
    });

    return {
      success: true,
      model: 'claude-4.5',
      ...result
    };

  } catch (error) {
    logger.error('AI Implantation: Claude 4.5 error', { error: error.message });
    throw error;
  }
};

/**
 * Smart model selection with fallback
 * Priority: Claude (complex 3D) > GPT (medium) > Gemini (simple/fast)
 */
exports.generateImplantation = async (params, preferredModel = 'auto') => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOpenAI && !hasGemini && !hasClaude) {
    throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY');
  }

  // Model selection logic - Claude prioritized for complex 3D layouts
  let primaryModel, fallbackModel, secondFallback;

  const objectCount = Object.values(params.availableObjects || {})
    .reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const isComplex = objectCount > 15 || (params.targetPowerMW && params.targetPowerMW > 3);
  const engineerProfile = params.engineerProfile || 'generalist';
  
  // 3D profile always prefers Claude for best spatial reasoning
  const is3DProfile = engineerProfile === '3d';

  if (preferredModel === 'claude') {
    primaryModel = hasClaude ? 'claude' : (hasOpenAI ? 'gpt' : 'gemini');
    fallbackModel = hasOpenAI ? 'gpt' : (hasGemini ? 'gemini' : null);
    secondFallback = hasGemini ? 'gemini' : null;
  } else if (preferredModel === 'gpt') {
    primaryModel = hasOpenAI ? 'gpt' : (hasClaude ? 'claude' : 'gemini');
    fallbackModel = hasClaude ? 'claude' : (hasGemini ? 'gemini' : null);
    secondFallback = hasGemini ? 'gemini' : null;
  } else if (preferredModel === 'gemini') {
    primaryModel = hasGemini ? 'gemini' : (hasOpenAI ? 'gpt' : 'claude');
    fallbackModel = hasOpenAI ? 'gpt' : (hasClaude ? 'claude' : null);
    secondFallback = hasClaude ? 'claude' : null;
  } else {
    // Auto selection based on profile and complexity
    if (is3DProfile || isComplex) {
      // 3D profile or complex layouts: Claude > GPT > Gemini (best spatial reasoning)
      primaryModel = hasClaude ? 'claude' : (hasOpenAI ? 'gpt' : 'gemini');
      fallbackModel = hasOpenAI ? 'gpt' : (hasGemini ? 'gemini' : null);
      secondFallback = hasGemini && primaryModel !== 'gemini' && fallbackModel !== 'gemini' ? 'gemini' : null;
    } else if (engineerProfile === 'electrical' || engineerProfile === 'thermal') {
      // Technical profiles: GPT > Claude > Gemini (good for calculations)
      primaryModel = hasOpenAI ? 'gpt' : (hasClaude ? 'claude' : 'gemini');
      fallbackModel = hasClaude ? 'claude' : (hasGemini ? 'gemini' : null);
      secondFallback = hasGemini && primaryModel !== 'gemini' && fallbackModel !== 'gemini' ? 'gemini' : null;
    } else {
      // Simple layouts or generalist: Gemini (fast) > GPT > Claude
      primaryModel = hasGemini ? 'gemini' : (hasOpenAI ? 'gpt' : 'claude');
      fallbackModel = hasOpenAI ? 'gpt' : (hasClaude ? 'claude' : null);
      secondFallback = hasClaude && primaryModel !== 'claude' && fallbackModel !== 'claude' ? 'claude' : null;
    }
  }

  logger.info('AI Implantation: Model selection', {
    engineerProfile,
    is3DProfile,
    isComplex,
    objectCount,
    preferredModel,
    primaryModel,
    fallbackModel,
    secondFallback,
    available: { claude: hasClaude, gpt: hasOpenAI, gemini: hasGemini }
  });

  const callModel = async (model) => {
    switch (model) {
      case 'claude': return await exports.generateImplantationClaude(params);
      case 'gpt': return await exports.generateImplantationGPT(params);
      case 'gemini': return await exports.generateImplantationGemini(params);
      default: throw new Error(`Unknown model: ${model}`);
    }
  };

  try {
    return await callModel(primaryModel);
  } catch (primaryError) {
    logger.warn('AI Implantation: Primary model failed, trying fallback', {
      primaryModel,
      fallbackModel,
      error: primaryError.message
    });

    if (fallbackModel) {
      try {
        return await callModel(fallbackModel);
      } catch (fallbackError) {
        logger.warn('AI Implantation: Fallback failed, trying second fallback', {
          fallbackModel,
          secondFallback,
          error: fallbackError.message
        });

        if (secondFallback) {
          return await callModel(secondFallback);
        }
        throw fallbackError;
      }
    }

    throw primaryError;
  }
};

/**
 * Engineer profile descriptions for specialized prompts
 */
const ENGINEER_PROFILES = {
  generalist: {
    title: 'Ingénieur Généraliste',
    focus: 'Vue d\'ensemble du projet, optimisation globale, respect des normes',
    expertise: `Tu adoptes une approche holistique en considérant tous les aspects:
- Layout optimal et circulation
- Équilibre entre performance et coût
- Conformité aux normes industrielles
- Évolutivité et maintenance`
  },
  electrical: {
    title: 'Ingénieur Électrique',
    focus: 'Infrastructure électrique, transformateurs, câblage, protection',
    expertise: `Tu es EXPERT en électricité industrielle haute puissance:
- Dimensionnement précis des transformateurs (kVA, pertes, distance)
- Calcul des sections de câbles (chute de tension <3%)
- Architecture électrique (HT→BT, TGBT, TD, PDU)
- Mise à la terre (<1Ω), sélectivité, arc flash
- Placement optimal des équipements électriques pour minimiser les pertes
- Distance transformateur-charge, chemins de câbles`
  },
  mining: {
    title: 'Ingénieur Mining',
    focus: 'Containers ASIC, hashrate, rentabilité, densité',
    expertise: `Tu es EXPERT en infrastructure mining Bitcoin:
- Optimisation de la densité de hashrate (TH/s par m²)
- Sélection des containers (HK3, HD5, 20ft, 40ft)
- Calcul de rentabilité (BTC/jour, ROI)
- Maximisation du nombre de slots ASIC
- Configuration hydro vs air-cooled
- Overclocking et underclocking selon l'électricité`
  },
  thermal: {
    title: 'Ingénieur Thermique',
    focus: 'Refroidissement, flux d\'air, PUE, dry coolers',
    expertise: `Tu es EXPERT en thermique industrielle mining:
- Dimensionnement des dry coolers (kW de dissipation)
- Optimisation du PUE (Power Usage Effectiveness) <1.2
- Conception hot aisle / cold aisle
- Orientation par rapport aux vents dominants
- Circuits hydrauliques (débit, ΔT, glycol)
- Choix hydro vs immersion vs air cooling
- Espacement optimal pour éviter recyclage air chaud`
  },
  '3d': {
    title: 'Ingénieur 3D / Réalisation',
    focus: 'Visualisation 3D, modélisation, rendu réaliste',
    expertise: `Tu es EXPERT en conception 3D pour mining:
- Placement visuel précis des objets dans l'espace 3D
- Dimensions exactes en millimètres pour les modèles
- Positions Y correctes (hauteur au sol)
- Rotations pour alignement visuel optimal
- Couleurs et matériaux réalistes
- Groupement logique des objets
- Préparation pour export GLTF/DXF`
  }
};

/**
 * Detect the type of user request
 * Returns: 'layout' | 'analysis' | 'conversation' | 'action'
 */
function detectRequestType(userPrompt, existingPlacements = []) {
  if (!userPrompt || userPrompt.trim().length < 3) return 'conversation';
  
  const prompt = userPrompt.toLowerCase();
  
  // Greetings and simple messages - conversation
  const greetings = ['hello', 'hi', 'bonjour', 'salut', 'hey', 'coucou', 'yo', 'bonsoir', 'test', 'allo', 'ok', 'oui', 'non', 'merci', 'thanks'];
  if (greetings.some(g => prompt === g || prompt === g + '!' || prompt === g + '?')) {
    return 'conversation';
  }
  
  // ACTION KEYWORDS - Modify/move/delete existing objects
  const actionKeywords = [
    'déplace', 'deplace', 'move', 'bouge', 'bouger', 'translate',
    'supprime', 'supprimer', 'delete', 'remove', 'enlève', 'enleve', 'retire', 'efface',
    'modifie', 'modifier', 'change', 'update', 'edit',
    'tourne', 'tourner', 'rotate', 'rotation', 'pivote', 'pivoter', 'oriente',
    'aligne', 'aligner', 'align', 'alignement',
    'regroupe', 'regrouper', 'group', 'rassemble',
    'duplique', 'dupliquer', 'duplicate', 'copie', 'copier', 'copy', 'clone',
    'réorganise', 'reorganise', 'reorganize', 'rearrange',
    'écarte', 'ecarte', 'espace', 'espacer', 'spread',
    'rapproche', 'rapprocher', 'closer',
    'centre', 'centrer', 'center',
    'met', 'mets', 'place', 'placer', 'positionne', 'positionner',
    'renomme', 'renommer', 'rename',
    'colore', 'colorier', 'couleur', 'color'
  ];
  
  if (existingPlacements.length > 0 && actionKeywords.some(kw => prompt.includes(kw))) {
    return 'action';
  }
  
  // Analysis/advice keywords - analyze current scene
  const analysisKeywords = [
    'analyse', 'analyze', 'scanner', 'scan', 'vérifie', 'verifier', 'check',
    'conseil', 'conseils', 'advice', 'suggestion', 'suggestions',
    'règlement', 'reglementation', 'regulation', 'norme', 'normes', 'standard',
    'problème', 'probleme', 'problem', 'issue', 'erreur', 'error',
    'améliorer', 'ameliorer', 'improve', 'optimiser', 'optimize',
    'que penses-tu', 'what do you think', 'avis', 'opinion',
    'distance', 'espacement', 'spacing', 'sécurité', 'securite', 'safety',
    'conforme', 'conformité', 'compliance', 'valide', 'valid',
    'review', 'revue', 'audit', 'inspection'
  ];
  
  if (analysisKeywords.some(kw => prompt.includes(kw))) {
    return 'analysis';
  }
  
  // Help request with existing objects - likely wants analysis
  if (existingPlacements.length > 0) {
    const helpKeywords = ['help', 'aide', 'comment', 'how', 'pourquoi', 'why', 'quoi', 'what'];
    if (helpKeywords.some(kw => prompt.includes(kw))) {
      return 'analysis';
    }
  }
  
  // Questions about the AI - conversation
  const questions = ['qui es-tu', 'who are you', 'que fais-tu', 'what do you do', 'comment ça marche', 'how does this work', "c'est quoi", 'what is this'];
  if (questions.some(q => prompt.includes(q))) {
    return 'conversation';
  }
  
  // Layout generation keywords
  const layoutKeywords = [
    'container', 'containers', 'ferme', 'farm', 'mining', 'minage',
    'mw', 'megawatt', 'puissance', 'power', 'layout', 'implantation',
    'génère', 'genere', 'generate', 'crée', 'cree', 'create', 'ajoute', 'add',
    'transformer', 'transformateur', 'cooling', 'refroidissement', 'dry cooler',
    'hd5', 'hk3', 'antspace', 'asic', 'bitcoin', 'btc',
    'design', 'dessine', 'organise', 'calcule'
  ];
  
  if (layoutKeywords.some(kw => prompt.includes(kw))) {
    return 'layout';
  }
  
  // Default: if there are existing objects and prompt is a question, analyze
  if (existingPlacements.length > 0 && (prompt.includes('?') || prompt.length < 50)) {
    return 'analysis';
  }
  
  return 'conversation';
}

/**
 * Regulations and standards knowledge base
 */
const REGULATIONS_KNOWLEDGE = `
═══════════════════════════════════════════════════════════════════════════════
RÉGLEMENTATIONS ET NORMES - FERMES DE MINAGE
═══════════════════════════════════════════════════════════════════════════════

DISTANCES DE SÉCURITÉ OBLIGATOIRES:

1. TRANSFORMATEURS (NEC/IEC/NFPA):
   - Distance frontale minimum: 3.0m (zone arc flash)
   - Distance latérale/arrière: 2.0m (accès maintenance)
   - Distance entre transformateurs: 1.5m minimum
   - Distance des bâtiments: 5m (risque incendie huile)
   - Zone de rétention huile: obligatoire (110% volume)

2. CONTAINERS MINING:
   - Espacement latéral minimum: 1.5m (maintenance + ventilation)
   - Espacement frontal (hot aisle): 4-5m minimum
   - Espacement dos-à-dos: 2-3m (extraction chaleur)
   - Distance des transformateurs: 5m minimum
   - Allée véhicules: 6m minimum (camion + grue)

3. DRY COOLERS / REFROIDISSEMENT:
   - Distance des admissions d'air: 10m minimum
   - Ne pas placer côté vents dominants (recyclage air chaud)
   - Distance entre dry coolers: 2m minimum
   - Hauteur minimale: 2.5m du sol (circulation air)

4. ÉLECTRIQUE:
   - PDU à moins de 15m des charges (pertes câbles)
   - TGBT accessible 24/7 (local fermé, ventilé)
   - Câbles HT enterrés ou en hauteur (>4m)
   - Distance disjoncteur général: accès <30s en urgence

5. ACCÈS POMPIERS (NFPA/APSAD R4):
   - Voie engins: 4m large, 3.5m hauteur libre
   - Distance max équipement-voie: 60m
   - Poteaux incendie: tous les 150m, débit 60 m³/h
   - Aire de retournement si impasse >30m

6. CIRCULATION:
   - Allée principale: 6m (semi-remorque + grue)
   - Allées secondaires: 4m (véhicule léger)
   - Allées piétonnes évacuation: 0.8m minimum
   - Issue de secours: visibilité <30m

VÉRIFICATIONS PAR TYPE D'OBJET:

CONTAINER:
□ Espacement latéral >1.5m ✓/✗
□ Distance transformateur >5m ✓/✗
□ Accès maintenance façade technique ✓/✗
□ Orientation flux d'air cohérente ✓/✗
□ Allée devant portes >4m ✓/✗

TRANSFORMER:
□ Zone dégagée frontale >3m ✓/✗
□ Accès maintenance 360° ✓/✗
□ Bac de rétention prévu ✓/✗
□ Distance containers >5m ✓/✗
□ Câblage <20m vers charges ✓/✗

COOLING (DRY COOLER):
□ Pas de recyclage air chaud ✓/✗
□ Espacement >2m autres coolers ✓/✗
□ Accès maintenance panneaux ✓/✗
□ Raccordement hydraulique accessible ✓/✗

PDU:
□ Distance charges <15m ✓/✗
□ Accès frontal >0.8m ✓/✗
□ Ventilation suffisante ✓/✗
`;

/**
 * Build action prompt for modifying existing objects
 */
function buildActionPrompt(params) {
  const { existingPlacements = [], dimensions = { width: 50, depth: 30 }, userPrompt = '' } = params;
  
  return `
Tu es un assistant expert en conception 3D de fermes de minage Bitcoin.
Tu dois MODIFIER, DÉPLACER, SUPPRIMER ou RÉORGANISER les objets existants selon la demande.

═══════════════════════════════════════════════════════════════════════════════
SCÈNE ACTUELLE (${existingPlacements.length} objets)
═══════════════════════════════════════════════════════════════════════════════

Dimensions du terrain: ${dimensions.width}m × ${dimensions.depth}m

OBJETS PRÉSENTS:
${JSON.stringify(existingPlacements.map(obj => ({
  id: obj.id,
  name: obj.name,
  type: obj.type,
  position: obj.position,
  rotation: obj.rotation,
  dimensions: obj.dimensions,
  color: obj.color
})), null, 2)}

═══════════════════════════════════════════════════════════════════════════════
DEMANDE UTILISATEUR
═══════════════════════════════════════════════════════════════════════════════
"${userPrompt}"

═══════════════════════════════════════════════════════════════════════════════
ACTIONS POSSIBLES
═══════════════════════════════════════════════════════════════════════════════

1. DÉPLACER: Change position.x, position.y, position.z
2. TOURNER: Change rotation.x, rotation.y, rotation.z (en radians)
3. SUPPRIMER: Ne pas inclure l'objet dans placements
4. DUPLIQUER: Ajouter une copie avec nouvel ID
5. MODIFIER: Changer name, color, etc.
6. RÉORGANISER: Repositionner plusieurs objets

═══════════════════════════════════════════════════════════════════════════════
RÈGLES IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

- CONSERVE les IDs des objets existants (sauf si supprimés)
- Pour SUPPRIMER un objet, ne l'inclus simplement pas dans le tableau placements
- Pour DUPLIQUER, crée un nouvel ID avec le préfixe "dup-"
- Respecte les distances de sécurité (containers: 1.5m, transfo: 3m)
- Positions en MÈTRES, dimensions en MILLIMÈTRES

RETOURNE UN JSON VALIDE:
{
  "placements": [
    {
      "id": "ID EXISTANT ou nouveau pour duplication",
      "objectId": "id template si applicable",
      "name": "nom de l'objet",
      "type": "type",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "dimensions": { "width": 12192, "height": 2896, "depth": 2438 },
      "color": "#8AFD81",
      "locked": false,
      "visible": true
    }
  ],
  "action": true,
  "changes": {
    "moved": ["id1", "id2"],
    "deleted": ["id3"],
    "duplicated": ["id4"],
    "modified": ["id5"]
  },
  "statistics": {
    "totalPowerKW": 0,
    "totalHashrateTH": 0,
    "machineSlots": 0,
    "coolingCapacityKW": 0,
    "utilizationPercent": 0
  },
  "zones": [],
  "recommendations": [
    "Description des changements effectués"
  ],
  "message": "Résumé des actions pour l'utilisateur EN FRANÇAIS"
}

IMPORTANT: 
- Le tableau "placements" doit contenir TOUS les objets après modification (pas seulement les changés)
- Les objets supprimés ne doivent PAS apparaître dans placements
- Conserve les propriétés existantes (locked, visible, scale) si non modifiées
`;
}

/**
 * Build analysis prompt for existing scene
 */
function buildAnalysisPrompt(params) {
  const { existingPlacements = [], dimensions = { width: 50, depth: 30 }, userPrompt = '' } = params;
  
  return `
Tu es un EXPERT en audit et conformité de fermes de minage Bitcoin.
Tu dois analyser la scène 3D actuelle et donner des conseils.

${REGULATIONS_KNOWLEDGE}

═══════════════════════════════════════════════════════════════════════════════
SCÈNE ACTUELLE À ANALYSER
═══════════════════════════════════════════════════════════════════════════════

Dimensions du terrain: ${dimensions.width}m × ${dimensions.depth}m

OBJETS PRÉSENTS (${existingPlacements.length} objets):
${JSON.stringify(existingPlacements.map(obj => ({
  id: obj.id,
  name: obj.name,
  type: obj.type,
  position: obj.position,
  rotation: obj.rotation,
  dimensions: obj.dimensions
})), null, 2)}

DEMANDE UTILISATEUR: "${userPrompt}"

═══════════════════════════════════════════════════════════════════════════════
MISSION
═══════════════════════════════════════════════════════════════════════════════

1. ANALYSE chaque objet et sa position
2. VÉRIFIE les distances de sécurité entre objets
3. IDENTIFIE les problèmes de conformité
4. DONNE des conseils d'amélioration spécifiques
5. CITE les normes applicables

Pour chaque problème trouvé, indique:
- L'objet concerné (nom et ID)
- Le problème détecté
- La norme ou règle violée
- La solution recommandée

RETOURNE UN JSON VALIDE:
{
  "placements": [],
  "analysis": true,
  "statistics": {
    "totalPowerKW": 0,
    "totalHashrateTH": 0,
    "machineSlots": 0,
    "coolingCapacityKW": 0,
    "utilizationPercent": 0,
    "objectsAnalyzed": ${existingPlacements.length}
  },
  "zones": [],
  "issues": [
    {
      "objectId": "id de l'objet",
      "objectName": "nom de l'objet",
      "severity": "critical | warning | info",
      "issue": "Description du problème",
      "regulation": "Norme applicable (ex: NFPA 70E, NEC, IEC)",
      "solution": "Action corrective recommandée"
    }
  ],
  "recommendations": [
    "Conseil global 1",
    "Conseil global 2"
  ],
  "complianceScore": 0-100,
  "message": "Résumé de l'analyse pour l'utilisateur"
}

NE GÉNÈRE PAS de nouveaux placements. Le tableau "placements" doit être VIDE [].
Concentre-toi sur l'ANALYSE et les CONSEILS.
`;
}

/**
 * Build the prompt for implantation
 */
function buildImplantationPrompt(params) {
  const {
    availableObjects = {},
    constraints = {},
    targetPowerMW,
    dimensions = { width: 50, depth: 30 },
    existingPlacements = [],
    preferences = {},
    userPrompt = '',
    engineerProfile = 'generalist',
    engineerSkills = []
  } = params;

  const profile = ENGINEER_PROFILES[engineerProfile] || ENGINEER_PROFILES.generalist;
  
  // Detect the type of request
  const requestType = detectRequestType(userPrompt, existingPlacements);
  
  // ACTION MODE - Modify/move/delete existing objects
  if (requestType === 'action') {
    return buildActionPrompt(params);
  }
  
  // ANALYSIS MODE - Analyze existing scene
  if (requestType === 'analysis') {
    return buildAnalysisPrompt(params);
  }
  
  // CONVERSATION MODE - Just chat
  if (requestType === 'conversation') {
    return `
Tu es un assistant expert en conception de fermes de minage Bitcoin.
L'utilisateur a dit: "${userPrompt}"

Ce message ne semble PAS être une demande de génération de layout.
Réponds de manière conversationnelle et utile EN FRANÇAIS.

Si l'utilisateur te salue, présente-toi brièvement:
"Bonjour ! Je suis l'assistant IA de Hearst Mining Architect. Je peux:
- Générer des layouts de ferme mining (ex: 'Crée une ferme 10 MW')
- Analyser ta scène actuelle (ex: 'Analyse ma scène' ou 'Vérifie les distances')
- Donner des conseils sur les normes et réglementations
Comment puis-je t'aider ?"

Si l'utilisateur pose une question, réponds-y.
Si tu ne comprends pas, demande des précisions.

${existingPlacements.length > 0 ? `
Note: L'utilisateur a actuellement ${existingPlacements.length} objets dans sa scène.
Tu peux lui proposer d'analyser sa scène pour vérifier la conformité.
` : ''}

IMPORTANT: Retourne TOUJOURS un JSON valide avec cette structure:
{
  "placements": [],
  "statistics": { "totalPowerKW": 0, "totalHashrateTH": 0, "machineSlots": 0, "coolingCapacityKW": 0, "utilizationPercent": 0 },
  "zones": [],
  "recommendations": [],
  "conversational": true,
  "message": "Ta réponse à l'utilisateur EN FRANÇAIS"
}

NE GÉNÈRE PAS de placements. Placements doit être un tableau VIDE [].
`;
  }

  // LAYOUT GENERATION MODE
  return `
MISSION: Génère une implantation optimale pour une ferme de minage Bitcoin.

═══════════════════════════════════════════════════════════════════════════════
PROFIL D'INGÉNIEUR ACTIF: ${profile.title}
═══════════════════════════════════════════════════════════════════════════════
Focus: ${profile.focus}

${profile.expertise}

${engineerSkills.length > 0 ? `
COMPÉTENCES ACTIVÉES: ${engineerSkills.join(', ')}
` : ''}

${userPrompt ? `
DEMANDE UTILISATEUR:
"${userPrompt}"
` : ''}

ESPACE DISPONIBLE:
- Largeur: ${dimensions.width}m
- Profondeur: ${dimensions.depth}m
- Surface: ${dimensions.width * dimensions.depth}m²

${targetPowerMW ? `OBJECTIF PUISSANCE: ${targetPowerMW} MW` : ''}

OBJETS DISPONIBLES (bibliothèque):
${JSON.stringify(availableObjects, null, 2)}

${existingPlacements.length > 0 ? `
PLACEMENTS EXISTANTS (à respecter):
${JSON.stringify(existingPlacements, null, 2)}
` : ''}

${Object.keys(constraints).length > 0 ? `
CONTRAINTES SPÉCIFIQUES:
${JSON.stringify(constraints, null, 2)}
` : ''}

${Object.keys(preferences).length > 0 ? `
PRÉFÉRENCES:
${JSON.stringify(preferences, null, 2)}
` : ''}

RETOURNE UN JSON avec cette structure EXACTE:
{
  "placements": [
    {
      "objectId": "id de l'objet de la bibliothèque",
      "name": "nom descriptif",
      "type": "type d'objet (container, rack, pdu, cooling, etc.)",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "dimensions": { "width": 1000, "height": 1000, "depth": 1000 },
      "color": "#8AFD81"
    }
  ],
  "statistics": {
    "totalPowerKW": 0,
    "totalHashrateTH": 0,
    "machineSlots": 0,
    "coolingCapacityKW": 0,
    "utilizationPercent": 0
  },
  "zones": [
    {
      "name": "Zone name",
      "type": "mining | cooling | electrical | access",
      "bounds": { "minX": 0, "maxX": 10, "minZ": 0, "maxZ": 10 }
    }
  ],
  "recommendations": [
    "Recommandation 1",
    "Recommandation 2"
  ]
}

IMPORTANT: Les positions sont en mètres. Les dimensions dans les objets sont en millimètres.
Les positions Y sont la hauteur (sol = 0).
`;
}

/**
 * Validate AI-generated placements
 */
exports.validatePlacements = (placements, dimensions) => {
  const errors = [];
  const warnings = [];

  for (const p of placements) {
    // Check bounds
    if (p.position.x < 0 || p.position.x > dimensions.width) {
      errors.push(`${p.name}: position X hors limites`);
    }
    if (p.position.z < 0 || p.position.z > dimensions.depth) {
      errors.push(`${p.name}: position Z hors limites`);
    }

    // Check required fields
    if (!p.objectId && !p.type) {
      errors.push(`${p.name}: objectId ou type manquant`);
    }
  }

  // Check collisions (simplified)
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];
      const distance = Math.sqrt(
        Math.pow(a.position.x - b.position.x, 2) +
        Math.pow(a.position.z - b.position.z, 2)
      );
      if (distance < 0.5) {
        warnings.push(`Collision possible: ${a.name} et ${b.name}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Get AI service status
 */
exports.getStatus = () => {
  return {
    claude: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      priority: 'complex-3d',
      description: 'Best for complex 3D layouts (>15 objects, >3MW)'
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
      model: 'gpt-4.1-2025-04-14',
      priority: 'medium',
      description: 'Good for medium complexity layouts'
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash-exp',
      priority: 'fast',
      description: 'Fast generation for simple layouts'
    }
  };
};
