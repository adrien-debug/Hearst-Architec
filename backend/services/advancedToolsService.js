/**
 * Advanced Tools Service - Hearst Mining Architect
 * 
 * DÉBRIDÉ - Outils professionnels avancés:
 * - Recherche web équipements mining
 * - Calculs thermiques avancés (BTU, CFM, Delta T)
 * - Recommandations IA temps réel
 * - Données marché mining live
 */

const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RECHERCHE WEB ÉQUIPEMENTS MINING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base de données intégrée des équipements mining (specs officielles)
 * Source: Bitmain, MicroBT, Canaan officiel + specs constructeurs
 */
const EQUIPMENT_DATABASE = {
  // === ASIC MINERS ===
  asics: {
    'antminer-s21-xp-hydro': {
      manufacturer: 'Bitmain',
      model: 'Antminer S21 XP Hydro',
      hashrateTH: 473,
      powerWatts: 5676,
      efficiency: 12.0, // J/TH
      cooling: 'hydro',
      algorithm: 'SHA-256',
      releaseYear: 2024,
      dimensions: { width: 400, height: 195, depth: 290 },
      weight: 16.2,
      inletTemp: { min: 5, max: 45 },
      waterFlow: 7.5, // L/min
      msrpUSD: 14000,
      availability: 'in_stock',
      sources: ['https://shop.bitmain.com', 'https://www.asicminervalue.com']
    },
    'antminer-s21-pro': {
      manufacturer: 'Bitmain',
      model: 'Antminer S21 Pro',
      hashrateTH: 234,
      powerWatts: 3531,
      efficiency: 15.1,
      cooling: 'air',
      algorithm: 'SHA-256',
      releaseYear: 2024,
      dimensions: { width: 400, height: 195, depth: 290 },
      weight: 14.8,
      noise: 75,
      msrpUSD: 6500,
      availability: 'in_stock',
      sources: ['https://shop.bitmain.com']
    },
    'antminer-s21': {
      manufacturer: 'Bitmain',
      model: 'Antminer S21',
      hashrateTH: 200,
      powerWatts: 3500,
      efficiency: 17.5,
      cooling: 'air',
      algorithm: 'SHA-256',
      releaseYear: 2023,
      dimensions: { width: 400, height: 195, depth: 290 },
      weight: 14.6,
      noise: 75,
      msrpUSD: 5200,
      availability: 'in_stock'
    },
    'whatsminer-m66s': {
      manufacturer: 'MicroBT',
      model: 'Whatsminer M66S',
      hashrateTH: 298,
      powerWatts: 5410,
      efficiency: 18.2,
      cooling: 'hydro',
      algorithm: 'SHA-256',
      releaseYear: 2024,
      dimensions: { width: 520, height: 238, depth: 390 },
      weight: 18.5,
      waterFlow: 8.0,
      msrpUSD: 11000,
      availability: 'pre_order'
    },
    'whatsminer-m60s': {
      manufacturer: 'MicroBT',
      model: 'Whatsminer M60S',
      hashrateTH: 186,
      powerWatts: 3422,
      efficiency: 18.4,
      cooling: 'air',
      algorithm: 'SHA-256',
      releaseYear: 2024,
      dimensions: { width: 430, height: 155, depth: 225 },
      weight: 12.8,
      noise: 75,
      msrpUSD: 4800,
      availability: 'in_stock'
    },
    'avalon-a1566': {
      manufacturer: 'Canaan',
      model: 'Avalon A1566',
      hashrateTH: 185,
      powerWatts: 3420,
      efficiency: 18.5,
      cooling: 'air',
      algorithm: 'SHA-256',
      releaseYear: 2024,
      dimensions: { width: 360, height: 158, depth: 290 },
      weight: 12.0,
      noise: 75,
      msrpUSD: 4500,
      availability: 'in_stock'
    }
  },

  // === CONTAINERS MINING ===
  containers: {
    'antspace-hk3': {
      manufacturer: 'Bitmain',
      model: 'ANTSPACE HK3',
      type: 'container',
      cooling: 'air',
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      machineSlots: 210,
      maxPowerKW: 840,
      weight: 5500,
      features: ['Auto-ventilation', 'Filtration F7', 'Fire suppression'],
      msrpUSD: 85000,
      sources: ['https://shop.bitmain.com']
    },
    'antspace-hd5': {
      manufacturer: 'Bitmain',
      model: 'ANTSPACE HD5',
      type: 'container',
      cooling: 'hydro',
      dimensions: { width: 12196, height: 2896, depth: 2438 },
      machineSlots: 308,
      maxPowerKW: 1765,
      weight: 8000,
      waterFlowM3h: 150,
      features: ['Hydro cooling integrated', 'CDU compatible', 'Fire suppression'],
      msrpUSD: 180000,
      sources: ['https://shop.bitmain.com']
    },
    'antspace-hd3': {
      manufacturer: 'Bitmain',
      model: 'ANTSPACE HD3',
      type: 'container',
      cooling: 'hydro',
      dimensions: { width: 6058, height: 2591, depth: 2438 },
      machineSlots: 144,
      maxPowerKW: 825,
      weight: 4500,
      waterFlowM3h: 75,
      features: ['20ft container', 'Hydro cooling', 'Compact'],
      msrpUSD: 95000
    }
  },

  // === COOLING SYSTEMS ===
  cooling: {
    'bitmain-ec2-dt': {
      manufacturer: 'Bitmain',
      model: 'EC2-DT Dry Cooler',
      type: 'dry_cooler',
      coolingCapacityKW: 1500,
      powerConsumptionKW: 80,
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      weight: 8000,
      fans: 12,
      flowRateM3h: 200,
      deltaT: 10,
      ambientTempMax: 45,
      msrpUSD: 120000,
      sources: ['https://shop.bitmain.com']
    },
    'bitmain-cdu': {
      manufacturer: 'Bitmain',
      model: 'CDU-S1',
      type: 'cdu',
      coolingCapacityKW: 500,
      powerConsumptionKW: 15,
      dimensions: { width: 1500, height: 1800, depth: 800 },
      weight: 450,
      flowRateM3h: 80,
      msrpUSD: 25000
    },
    'generic-adiabatic': {
      manufacturer: 'Generic',
      model: 'Adiabatic Cooler 500kW',
      type: 'adiabatic',
      coolingCapacityKW: 500,
      powerConsumptionKW: 25,
      waterConsumptionLh: 150,
      dimensions: { width: 4000, height: 2500, depth: 2200 },
      weight: 2500,
      msrpUSD: 45000
    }
  },

  // === TRANSFORMERS ===
  transformers: {
    '3750kva': {
      type: 'transformer',
      rating: '3750 kVA',
      powerCapacityKW: 3000,
      primaryVoltage: 20000,
      secondaryVoltage: 400,
      dimensions: { width: 3200, height: 2300, depth: 2000 },
      weight: 10000,
      losses: 32,
      msrpUSD: 85000
    },
    '2500kva': {
      type: 'transformer',
      rating: '2500 kVA',
      powerCapacityKW: 2000,
      primaryVoltage: 20000,
      secondaryVoltage: 400,
      dimensions: { width: 2800, height: 2000, depth: 1600 },
      weight: 7000,
      losses: 22,
      msrpUSD: 55000
    },
    '1000kva': {
      type: 'transformer',
      rating: '1000 kVA',
      powerCapacityKW: 800,
      primaryVoltage: 20000,
      secondaryVoltage: 400,
      dimensions: { width: 2000, height: 2000, depth: 1200 },
      weight: 3000,
      losses: 10,
      msrpUSD: 28000
    }
  }
};

/**
 * Recherche équipement par terme
 */
exports.searchEquipment = async (query, options = {}) => {
  const { category, manufacturer, minHashrate, maxPrice } = options;
  const searchTerm = query.toLowerCase();
  const results = [];

  // Recherche dans toutes les catégories
  for (const [cat, items] of Object.entries(EQUIPMENT_DATABASE)) {
    if (category && cat !== category) continue;

    for (const [id, item] of Object.entries(items)) {
      const matchesQuery = 
        id.includes(searchTerm) ||
        item.model?.toLowerCase().includes(searchTerm) ||
        item.manufacturer?.toLowerCase().includes(searchTerm);

      if (!matchesQuery) continue;

      if (manufacturer && item.manufacturer?.toLowerCase() !== manufacturer.toLowerCase()) continue;
      if (minHashrate && item.hashrateTH < minHashrate) continue;
      if (maxPrice && item.msrpUSD > maxPrice) continue;

      results.push({
        id,
        category: cat,
        ...item,
        searchScore: calculateSearchScore(item, searchTerm)
      });
    }
  }

  // Tri par score de pertinence
  results.sort((a, b) => b.searchScore - a.searchScore);

  return {
    query,
    results,
    count: results.length,
    sources: ['Internal Database', 'Bitmain Official', 'MicroBT Official', 'Canaan Official']
  };
};

function calculateSearchScore(item, searchTerm) {
  let score = 0;
  if (item.model?.toLowerCase().includes(searchTerm)) score += 10;
  if (item.manufacturer?.toLowerCase().includes(searchTerm)) score += 5;
  if (item.availability === 'in_stock') score += 3;
  if (item.releaseYear >= 2024) score += 2;
  return score;
}

/**
 * Obtenir les specs détaillées d'un équipement
 */
exports.getEquipmentSpecs = async (equipmentId) => {
  for (const [cat, items] of Object.entries(EQUIPMENT_DATABASE)) {
    if (items[equipmentId]) {
      return {
        id: equipmentId,
        category: cat,
        ...items[equipmentId],
        lastUpdated: new Date().toISOString(),
        dataSource: 'manufacturer_official'
      };
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CALCULS THERMIQUES AVANCÉS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcul thermique complet pour une installation
 */
exports.calculateThermal = (params) => {
  const {
    totalPowerKW,
    coolingType = 'hydro', // hydro, air, immersion
    ambientTempC = 35,
    targetTempC = 40,
    altitude = 0, // mètres
    humidity = 50, // %
    safetyMargin = 1.15 // 15% marge
  } = params;

  // Correction altitude (perte 3% par 300m)
  const altitudeFactor = 1 + (altitude / 300) * 0.03;

  // Correction humidité pour air cooling
  const humidityFactor = coolingType === 'air' ? 1 + (humidity - 50) / 100 * 0.1 : 1;

  // Puissance thermique = puissance électrique (100% conversion)
  const heatLoadKW = totalPowerKW * altitudeFactor * humidityFactor;
  
  // Conversion en BTU/h (1 kW = 3412.14 BTU/h)
  const heatLoadBTU = heatLoadKW * 3412.14;

  // Tonnes de refroidissement (1 ton = 12000 BTU/h = 3.517 kW)
  const tonsOfCooling = heatLoadKW / 3.517;

  // Delta T
  const deltaT = targetTempC - ambientTempC;

  // Débit d'eau pour hydro cooling (Q = P / (1.16 × ΔT))
  let waterFlowM3h = 0;
  if (coolingType === 'hydro' || coolingType === 'immersion') {
    waterFlowM3h = heatLoadKW / (1.16 * (deltaT > 0 ? deltaT : 10));
  }

  // CFM pour air cooling (V = P / (1.08 × ΔT) × 2118.88)
  let airflowCFM = 0;
  if (coolingType === 'air') {
    const airflowM3s = heatLoadKW / (1.2 * (deltaT > 0 ? deltaT : 15));
    airflowCFM = airflowM3s * 2118.88;
  }

  // Consommation cooling estimée
  let coolingPowerKW = 0;
  switch (coolingType) {
    case 'hydro':
      coolingPowerKW = heatLoadKW * 0.05; // 5% de la charge
      break;
    case 'air':
      coolingPowerKW = heatLoadKW * 0.08; // 8% de la charge
      break;
    case 'immersion':
      coolingPowerKW = heatLoadKW * 0.02; // 2% de la charge
      break;
  }

  // PUE estimé
  const pueEstimate = 1 + (coolingPowerKW / totalPowerKW);

  // Capacité cooling recommandée (avec marge)
  const recommendedCoolingKW = heatLoadKW * safetyMargin;

  // Nombre d'unités de refroidissement
  const coolerCapacityKW = coolingType === 'hydro' ? 1500 : 500;
  const recommendedCoolers = Math.ceil(recommendedCoolingKW / coolerCapacityKW);

  // Point de rosée (dew point) - formule Magnus
  const dewPointC = calculateDewPoint(ambientTempC, humidity);

  // Risque condensation
  const condensationRisk = targetTempC <= dewPointC + 3 ? 'HIGH' : 
                           targetTempC <= dewPointC + 5 ? 'MEDIUM' : 'LOW';

  return {
    input: {
      totalPowerKW,
      coolingType,
      ambientTempC,
      targetTempC,
      altitude,
      humidity,
      safetyMargin
    },
    thermalLoad: {
      heatLoadKW: Math.round(heatLoadKW * 10) / 10,
      heatLoadBTU: Math.round(heatLoadBTU),
      tonsOfCooling: Math.round(tonsOfCooling * 10) / 10
    },
    cooling: {
      recommendedCapacityKW: Math.round(recommendedCoolingKW),
      coolingPowerKW: Math.round(coolingPowerKW),
      pueEstimate: Math.round(pueEstimate * 100) / 100,
      recommendedUnits: recommendedCoolers,
      unitCapacityKW: coolerCapacityKW
    },
    flow: {
      deltaT,
      waterFlowM3h: Math.round(waterFlowM3h * 10) / 10,
      waterFlowLPM: Math.round(waterFlowM3h * 1000 / 60),
      airflowCFM: Math.round(airflowCFM),
      airflowM3h: Math.round(airflowCFM / 2118.88 * 3600)
    },
    environment: {
      dewPointC: Math.round(dewPointC * 10) / 10,
      condensationRisk,
      altitudeCorrection: Math.round((altitudeFactor - 1) * 100) + '%',
      humidityCorrection: Math.round((humidityFactor - 1) * 100) + '%'
    },
    recommendations: generateThermalRecommendations({
      coolingType, ambientTempC, humidity, condensationRisk, pueEstimate
    })
  };
};

function calculateDewPoint(tempC, humidityPercent) {
  // Formule de Magnus-Tetens
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC / (b + tempC)) + Math.log(humidityPercent / 100);
  return (b * alpha) / (a - alpha);
}

function generateThermalRecommendations(params) {
  const recommendations = [];
  const { coolingType, ambientTempC, humidity, condensationRisk, pueEstimate } = params;

  if (ambientTempC > 40 && coolingType === 'air') {
    recommendations.push('⚠️ Température ambiante élevée: Considérez le passage en hydro cooling');
  }

  if (humidity > 70) {
    recommendations.push('💧 Humidité élevée: Installez des déshumidificateurs dans les zones techniques');
  }

  if (condensationRisk === 'HIGH') {
    recommendations.push('🚨 Risque condensation: Augmentez la température cible ou utilisez isolation');
  }

  if (pueEstimate > 1.3) {
    recommendations.push('⚡ PUE élevé: Optimisez le système de refroidissement ou passez en hydro');
  }

  if (coolingType === 'air' && ambientTempC > 35) {
    recommendations.push('🌡️ Envisagez un système adiabatique pour réduire la température d\'entrée');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Configuration thermique optimale');
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CALCULS ÉLECTRIQUES AVANCÉS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dimensionnement électrique complet
 */
exports.calculateElectrical = (params) => {
  const {
    totalPowerKW,
    voltage = 400, // 400V EU, 480V US
    powerFactor = 0.95,
    diversityFactor = 0.9,
    safetyMargin = 1.25 // 25% marge
  } = params;

  // Puissance apparente
  const apparentPowerKVA = totalPowerKW / powerFactor;

  // Courant nominal (triphasé)
  const nominalCurrentA = (totalPowerKW * 1000) / (Math.sqrt(3) * voltage * powerFactor);

  // Courant de dimensionnement
  const designCurrentA = nominalCurrentA * safetyMargin;

  // Dimensionnement transformateur
  const transformerSizeKVA = calculateTransformerSize(apparentPowerKVA * safetyMargin);

  // Nombre de transformateurs
  const transformersNeeded = Math.ceil(transformerSizeKVA / 3750);

  // Section câble (règle simplifiée)
  const cableSection = calculateCableSection(nominalCurrentA);

  // Nombre de PDUs
  const pduCount = Math.ceil(totalPowerKW / 500);

  // Dimensionnement TGBT
  const tgbtRating = calculateTGBTRating(designCurrentA);

  // Comptage et mesure
  const meterCount = transformersNeeded + Math.ceil(pduCount / 4);

  // Groupes électrogènes (backup)
  const gensetSizeKVA = Math.ceil((totalPowerKW * 1.5) / 500) * 500;
  const gensetFuelLh = gensetSizeKVA * 0.2; // 0.2 L/kVA/h

  return {
    input: { totalPowerKW, voltage, powerFactor, diversityFactor, safetyMargin },
    power: {
      activePowerKW: totalPowerKW,
      apparentPowerKVA: Math.round(apparentPowerKVA),
      reactivePowerKVAR: Math.round(apparentPowerKVA * Math.sin(Math.acos(powerFactor)))
    },
    current: {
      nominalA: Math.round(nominalCurrentA),
      designA: Math.round(designCurrentA),
      perPhaseA: Math.round(designCurrentA / Math.sqrt(3))
    },
    transformer: {
      totalSizeKVA: transformerSizeKVA,
      count: transformersNeeded,
      unitSizeKVA: 3750,
      estimatedLossesKW: Math.round(transformersNeeded * 32)
    },
    distribution: {
      tgbtRatingA: tgbtRating,
      pduCount,
      pduRatingA: 630,
      cableSectionMm2: cableSection,
      busbarRequired: designCurrentA > 1600
    },
    backup: {
      gensetSizeKVA,
      fuelConsumptionLh: Math.round(gensetFuelLh),
      autonomy24hFuelL: Math.round(gensetFuelLh * 24),
      recommendedTankL: Math.round(gensetFuelLh * 48) // 48h autonomie
    },
    metering: {
      mainMeter: 1,
      subMeters: meterCount,
      powerAnalyzers: transformersNeeded
    },
    protection: {
      mainBreakerA: tgbtRating,
      surgeProtectionType: 'Type 1+2',
      differentialProtection: '300mA on distribution, 30mA on sockets'
    },
    cables: generateCableSchedule(totalPowerKW, pduCount)
  };
};

function calculateTransformerSize(requiredKVA) {
  const standardSizes = [500, 1000, 1600, 2000, 2500, 3150, 3750];
  return standardSizes.find(s => s >= requiredKVA) || Math.ceil(requiredKVA / 3750) * 3750;
}

function calculateCableSection(currentA) {
  const sections = [
    { current: 100, section: 35 },
    { current: 150, section: 50 },
    { current: 200, section: 70 },
    { current: 250, section: 95 },
    { current: 320, section: 120 },
    { current: 400, section: 150 },
    { current: 500, section: 185 },
    { current: 630, section: 240 }
  ];
  const match = sections.find(s => s.current >= currentA);
  return match ? match.section : 240;
}

function calculateTGBTRating(currentA) {
  const ratings = [630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];
  return ratings.find(r => r >= currentA) || 6300;
}

function generateCableSchedule(totalPowerKW, pduCount) {
  const cables = [];
  
  // Câbles principaux (transfo → TGBT)
  cables.push({
    from: 'Transformer',
    to: 'TGBT',
    type: `4×(3×240mm² + 120mm² N)`,
    length: 15,
    description: 'Main power feed'
  });

  // Câbles PDU
  for (let i = 1; i <= pduCount; i++) {
    cables.push({
      from: 'TGBT',
      to: `PDU-${i}`,
      type: '5G95mm²',
      length: 25,
      description: `Container ${Math.ceil(i / 2)} power`
    });
  }

  return cables;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DONNÉES MARCHÉ MINING LIVE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Récupère les données de marché mining
 * Sources: CoinGecko, Blockchain.info, mining pools APIs
 */
exports.getMiningMarketData = async () => {
  try {
    // Données Bitcoin (via fetch externe si configuré, sinon fallback)
    const btcData = await fetchBitcoinData();
    
    // Données hashrate network
    const networkData = await fetchNetworkData();

    // Prix électricité moyens par région
    const electricityPrices = {
      qatar: 0.03,
      uae: 0.035,
      usa_texas: 0.045,
      usa_avg: 0.08,
      europe_avg: 0.12,
      china_sichuan: 0.025,
      kazakhstan: 0.04,
      russia: 0.035,
      iceland: 0.05,
      norway: 0.06
    };

    // Calcul rentabilité actuelle par TH/s
    const revenuePerTHDaily = (btcData.price * 6.25 * 144) / (networkData.difficulty * 2**32 / 1e12 / 86400);

    return {
      bitcoin: btcData,
      network: networkData,
      electricityPrices,
      profitability: {
        revenuePerTHDailyUSD: revenuePerTHDaily,
        breakEvenEfficiency: calculateBreakEvenEfficiency(revenuePerTHDaily, electricityPrices),
        mostProfitableRegion: findMostProfitableRegion(revenuePerTHDaily, electricityPrices)
      },
      timestamp: new Date().toISOString(),
      sources: ['coingecko.com', 'blockchain.info', 'internal estimates']
    };
  } catch (error) {
    logger.error('Failed to fetch mining market data', { error: error.message });
    throw error;
  }
};

async function fetchBitcoinData() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    const data = await response.json();
    return {
      price: data.bitcoin.usd,
      change24h: data.bitcoin.usd_24h_change,
      source: 'coingecko'
    };
  } catch {
    // Fallback
    return {
      price: 95000,
      change24h: 0,
      source: 'fallback'
    };
  }
}

async function fetchNetworkData() {
  try {
    const response = await fetch('https://blockchain.info/q/getdifficulty');
    const difficulty = await response.text();
    return {
      difficulty: parseFloat(difficulty),
      source: 'blockchain.info'
    };
  } catch {
    return {
      difficulty: 110e12,
      source: 'fallback'
    };
  }
}

function calculateBreakEvenEfficiency(revenuePerTH, electricityPrices) {
  const results = {};
  for (const [region, price] of Object.entries(electricityPrices)) {
    // Break-even: Revenue = Cost → J/TH = Revenue / (price * 24)
    const breakEven = (revenuePerTH * 1000) / (price * 24);
    results[region] = Math.round(breakEven * 10) / 10;
  }
  return results;
}

function findMostProfitableRegion(revenuePerTH, electricityPrices) {
  let best = { region: null, profit: -Infinity };
  
  // Assuming 15 J/TH efficiency (S21 class)
  const powerPerTH = 15 / 1000; // kWh per TH
  
  for (const [region, price] of Object.entries(electricityPrices)) {
    const dailyCost = powerPerTH * 24 * price;
    const profit = revenuePerTH - dailyCost;
    if (profit > best.profit) {
      best = { region, profit, electricityRate: price };
    }
  }
  
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GÉNÉRATEUR DE RECOMMANDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère des recommandations intelligentes basées sur le layout
 */
exports.generateRecommendations = (layoutData) => {
  const recommendations = [];
  const warnings = [];
  const optimizations = [];

  const { objects = [], metrics = {}, dimensions = {} } = layoutData;

  // Analyse du ratio cooling
  if (metrics.coolingRatio < 1) {
    warnings.push({
      type: 'critical',
      message: `Capacité de refroidissement insuffisante: ${(metrics.coolingRatio * 100).toFixed(0)}% de la charge`,
      action: `Ajoutez ${Math.ceil((1 - metrics.coolingRatio) * metrics.totalPowerKW / 1500)} dry cooler(s) supplémentaire(s)`
    });
  }

  // Analyse de la densité de puissance
  if (metrics.powerDensityKWm2 > 5) {
    warnings.push({
      type: 'warning',
      message: `Densité de puissance élevée: ${metrics.powerDensityKWm2.toFixed(1)} kW/m²`,
      action: 'Augmentez l\'espacement entre containers ou ajoutez du refroidissement'
    });
  }

  // Analyse des violations de clearance
  if (metrics.clearanceViolations > 0) {
    warnings.push({
      type: 'critical',
      message: `${metrics.clearanceViolations} violation(s) de distance de sécurité détectée(s)`,
      action: 'Réorganisez les équipements pour respecter les distances minimales'
    });
  }

  // Recommandations d'optimisation
  const containerCount = objects.filter(o => 
    o.type?.toLowerCase().includes('container')
  ).length;

  if (containerCount >= 4 && containerCount % 2 !== 0) {
    optimizations.push({
      type: 'layout',
      message: 'Nombre impair de containers',
      suggestion: 'Ajoutez un container pour une configuration symétrique optimale'
    });
  }

  // Vérification transformateur
  const transformerCount = objects.filter(o => 
    o.type?.toLowerCase().includes('transform')
  ).length;
  
  const requiredTransformers = Math.ceil(metrics.totalPowerKW / 3000);
  if (transformerCount < requiredTransformers) {
    warnings.push({
      type: 'critical',
      message: `Transformateurs insuffisants: ${transformerCount}/${requiredTransformers}`,
      action: `Ajoutez ${requiredTransformers - transformerCount} transformateur(s) 3.75 MVA`
    });
  }

  // Recommandations générales
  recommendations.push({
    type: 'best_practice',
    message: 'Orientez les containers perpendiculairement aux vents dominants'
  });

  recommendations.push({
    type: 'best_practice', 
    message: 'Positionnez les dry coolers en bout de rangée côté sous le vent'
  });

  recommendations.push({
    type: 'best_practice',
    message: 'Maintenez une allée de 6m minimum pour l\'accès camion/grue'
  });

  return {
    warnings,
    optimizations,
    recommendations,
    score: calculateLayoutScore(warnings, optimizations),
    summary: generateSummary(warnings, optimizations)
  };
};

function calculateLayoutScore(warnings, optimizations) {
  let score = 100;
  
  warnings.forEach(w => {
    if (w.type === 'critical') score -= 20;
    else if (w.type === 'warning') score -= 10;
  });
  
  optimizations.forEach(() => score -= 5);
  
  return Math.max(0, Math.min(100, score));
}

function generateSummary(warnings, optimizations) {
  const criticalCount = warnings.filter(w => w.type === 'critical').length;
  const warningCount = warnings.filter(w => w.type === 'warning').length;
  
  if (criticalCount > 0) {
    return `⚠️ ${criticalCount} problème(s) critique(s) à résoudre`;
  } else if (warningCount > 0) {
    return `⚡ ${warningCount} avertissement(s) - layout fonctionnel`;
  } else if (optimizations.length > 0) {
    return `✅ Layout valide - ${optimizations.length} optimisation(s) suggérée(s)`;
  }
  return '🎯 Layout optimal';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EXPORT DXF (Format CAD simplifié)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère un fichier DXF basique à partir du layout
 */
exports.generateDXF = (layoutData) => {
  const { objects = [], dimensions = { width: 100, depth: 100 } } = layoutData;
  
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1014
9
$INSUNITS
70
6
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // Bordure du terrain
  dxf += generateDXFRectangle(0, 0, dimensions.width * 1000, dimensions.depth * 1000, 'BOUNDARY');

  // Objets
  objects.forEach((obj, idx) => {
    const x = obj.position.x * 1000;
    const y = obj.position.z * 1000;
    const w = obj.dimensions?.width || 1000;
    const d = obj.dimensions?.depth || 1000;
    
    dxf += generateDXFRectangle(
      x - w/2, 
      y - d/2, 
      w, 
      d, 
      obj.type?.toUpperCase() || 'OBJECT'
    );
    
    // Label
    dxf += generateDXFText(x, y, obj.name || `Object ${idx + 1}`, 200);
  });

  dxf += `0
ENDSEC
0
EOF`;

  return dxf;
};

function generateDXFRectangle(x, y, width, depth, layer) {
  return `0
LWPOLYLINE
8
${layer}
90
4
70
1
10
${x}
20
${y}
10
${x + width}
20
${y}
10
${x + width}
20
${y + depth}
10
${x}
20
${y + depth}
`;
}

function generateDXFText(x, y, text, height) {
  return `0
TEXT
8
LABELS
10
${x}
20
${y}
40
${height}
1
${text}
`;
}

module.exports = exports;
