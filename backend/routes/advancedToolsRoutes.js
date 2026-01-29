/**
 * Advanced Tools Routes - Hearst Mining Architect
 * 
 * Routes débridées pour outils professionnels:
 * - Recherche équipements mining
 * - Calculs thermiques/électriques
 * - Données marché live
 * - Export DXF
 */

const express = require('express');
const router = express.Router();
const advancedToolsService = require('../services/advancedToolsService');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// RECHERCHE ÉQUIPEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/tools/search
 * Recherche équipements mining
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, manufacturer, minHashrate, maxPrice } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await advancedToolsService.searchEquipment(q, {
      category,
      manufacturer,
      minHashrate: minHashrate ? parseFloat(minHashrate) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    });

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Equipment search failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tools/equipment/:id
 * Détails d'un équipement
 */
router.get('/equipment/:id', async (req, res) => {
  try {
    const specs = await advancedToolsService.getEquipmentSpecs(req.params.id);
    
    if (!specs) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ success: true, data: specs });
  } catch (error) {
    logger.error('Equipment lookup failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tools/equipment
 * Liste tous les équipements disponibles
 */
router.get('/equipment', async (req, res) => {
  try {
    const allEquipment = await advancedToolsService.searchEquipment('', {});
    res.json({ success: true, data: allEquipment });
  } catch (error) {
    logger.error('Equipment list failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULS THERMIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/tools/thermal
 * Calcul thermique complet
 */
router.post('/thermal', async (req, res) => {
  try {
    const {
      totalPowerKW,
      coolingType,
      ambientTempC,
      targetTempC,
      altitude,
      humidity,
      safetyMargin
    } = req.body;

    if (!totalPowerKW || totalPowerKW <= 0) {
      return res.status(400).json({ error: 'totalPowerKW is required and must be positive' });
    }

    const result = advancedToolsService.calculateThermal({
      totalPowerKW,
      coolingType,
      ambientTempC,
      targetTempC,
      altitude,
      humidity,
      safetyMargin
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Thermal calculation failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULS ÉLECTRIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/tools/electrical
 * Dimensionnement électrique complet
 */
router.post('/electrical', async (req, res) => {
  try {
    const {
      totalPowerKW,
      voltage,
      powerFactor,
      diversityFactor,
      safetyMargin
    } = req.body;

    if (!totalPowerKW || totalPowerKW <= 0) {
      return res.status(400).json({ error: 'totalPowerKW is required and must be positive' });
    }

    const result = advancedToolsService.calculateElectrical({
      totalPowerKW,
      voltage,
      powerFactor,
      diversityFactor,
      safetyMargin
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Electrical calculation failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DONNÉES MARCHÉ MINING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/tools/market
 * Données marché mining live
 */
router.get('/market', async (req, res) => {
  try {
    const data = await advancedToolsService.getMiningMarketData();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Market data fetch failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMANDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/tools/recommendations
 * Génère des recommandations pour un layout
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { objects, metrics, dimensions } = req.body;
    
    const recommendations = advancedToolsService.generateRecommendations({
      objects,
      metrics,
      dimensions
    });

    res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Recommendations generation failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DXF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/tools/export/dxf
 * Export layout en DXF
 */
router.post('/export/dxf', async (req, res) => {
  try {
    const { objects, dimensions, projectName } = req.body;
    
    const dxfContent = advancedToolsService.generateDXF({ objects, dimensions });
    
    const filename = `${(projectName || 'layout').replace(/\s+/g, '_')}_${Date.now()}.dxf`;
    
    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(dxfContent);
  } catch (error) {
    logger.error('DXF export failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tools/export/json
 * Export layout en JSON
 */
router.post('/export/json', async (req, res) => {
  try {
    const { objects, dimensions, projectName, metrics } = req.body;
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projectName: projectName || 'Untitled',
      dimensions,
      objects,
      metrics,
      software: 'Hearst Mining Architect'
    };
    
    const filename = `${(projectName || 'layout').replace(/\s+/g, '_')}_${Date.now()}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    logger.error('JSON export failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK CALCULATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/tools/quick/btu
 * Conversion rapide kW → BTU
 */
router.get('/quick/btu', (req, res) => {
  const { kw } = req.query;
  const kwValue = parseFloat(kw);
  
  if (isNaN(kwValue)) {
    return res.status(400).json({ error: 'kw parameter required' });
  }

  res.json({
    success: true,
    data: {
      input: { kW: kwValue },
      output: {
        BTUh: Math.round(kwValue * 3412.14),
        tonsOfCooling: Math.round(kwValue / 3.517 * 100) / 100
      }
    }
  });
});

/**
 * GET /api/tools/quick/cfm
 * Calcul CFM pour air cooling
 */
router.get('/quick/cfm', (req, res) => {
  const { kw, deltaT } = req.query;
  const kwValue = parseFloat(kw);
  const deltaTValue = parseFloat(deltaT) || 15;
  
  if (isNaN(kwValue)) {
    return res.status(400).json({ error: 'kw parameter required' });
  }

  const m3s = kwValue / (1.2 * deltaTValue);
  const cfm = m3s * 2118.88;

  res.json({
    success: true,
    data: {
      input: { kW: kwValue, deltaT: deltaTValue },
      output: {
        CFM: Math.round(cfm),
        m3h: Math.round(m3s * 3600),
        m3s: Math.round(m3s * 100) / 100
      }
    }
  });
});

/**
 * GET /api/tools/quick/waterflow
 * Calcul débit eau pour hydro cooling
 */
router.get('/quick/waterflow', (req, res) => {
  const { kw, deltaT } = req.query;
  const kwValue = parseFloat(kw);
  const deltaTValue = parseFloat(deltaT) || 10;
  
  if (isNaN(kwValue)) {
    return res.status(400).json({ error: 'kw parameter required' });
  }

  const m3h = kwValue / (1.16 * deltaTValue);
  const lpm = m3h * 1000 / 60;

  res.json({
    success: true,
    data: {
      input: { kW: kwValue, deltaT: deltaTValue },
      output: {
        m3h: Math.round(m3h * 10) / 10,
        LPM: Math.round(lpm),
        GPM: Math.round(lpm * 0.264172)
      }
    }
  });
});

/**
 * GET /api/tools/quick/cable
 * Dimensionnement câble rapide
 */
router.get('/quick/cable', (req, res) => {
  const { kw, voltage, distance } = req.query;
  const kwValue = parseFloat(kw);
  const voltageValue = parseFloat(voltage) || 400;
  const distanceValue = parseFloat(distance) || 20;
  
  if (isNaN(kwValue)) {
    return res.status(400).json({ error: 'kw parameter required' });
  }

  // Courant triphasé
  const current = (kwValue * 1000) / (Math.sqrt(3) * voltageValue * 0.95);
  
  // Section câble (table IEC)
  const sections = [
    { current: 32, section: 6 },
    { current: 45, section: 10 },
    { current: 60, section: 16 },
    { current: 80, section: 25 },
    { current: 100, section: 35 },
    { current: 125, section: 50 },
    { current: 160, section: 70 },
    { current: 200, section: 95 },
    { current: 250, section: 120 },
    { current: 315, section: 150 },
    { current: 400, section: 185 },
    { current: 500, section: 240 }
  ];
  
  const match = sections.find(s => s.current >= current * 1.25) || { section: 240, current: 500 };

  // Chute de tension (approximation)
  const voltageDrop = (current * distanceValue * 2 * 0.02) / match.section;
  const voltageDropPercent = (voltageDrop / voltageValue) * 100;

  res.json({
    success: true,
    data: {
      input: { kW: kwValue, voltage: voltageValue, distanceM: distanceValue },
      output: {
        currentA: Math.round(current),
        cableSectionMm2: match.section,
        cableSpec: `5G${match.section}mm²`,
        voltageDropPercent: Math.round(voltageDropPercent * 100) / 100,
        voltageDropOK: voltageDropPercent < 3
      }
    }
  });
});

module.exports = router;
