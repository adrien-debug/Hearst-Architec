/**
 * Routes Index
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();

const calculatorRoutes = require('./calculatorRoutes');
const machineRoutes = require('./machineRoutes');
const farmRoutes = require('./farmRoutes');
const monitoringRoutes = require('./monitoringRoutes');
const networkRoutes = require('./networkRoutes');
const objectRoutes = require('./objectRoutes');
const layoutRoutes = require('./layoutRoutes');

// Mount routes
router.use('/calculator', calculatorRoutes);
router.use('/machines', machineRoutes);
router.use('/farms', farmRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/network', networkRoutes);
router.use('/objects', objectRoutes);
router.use('/layouts', layoutRoutes);

// API root info
router.get('/', (req, res) => {
  res.json({
    name: 'Hearst Mining Architect API',
    version: '1.0.0',
    description: 'Bitcoin Mining Farm Design and Management Tool',
    endpoints: {
      calculator: '/api/calculator - Mining profitability calculations',
      machines: '/api/machines - ASIC machine catalog',
      farms: '/api/farms - Farm management',
      monitoring: '/api/monitoring - Real-time monitoring',
      network: '/api/network - Bitcoin network data',
      objects: '/api/objects - Infrastructure objects (racks, PDU, cooling, etc.)',
      layouts: '/api/layouts - Layout design management'
    },
    documentation: '/api/docs'
  });
});

module.exports = router;
