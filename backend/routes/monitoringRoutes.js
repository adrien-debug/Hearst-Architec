/**
 * Monitoring Routes
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { demoMode } = require('../middleware/authMiddleware');
const { 
  validateSnapshot, 
  validateCreateAlert,
  validateHistoryQuery 
} = require('../middleware/validationMiddleware');

// All monitoring routes require authentication (or demo mode in dev)
router.use(demoMode);

// POST /api/monitoring/:farmId/snapshot - Record monitoring snapshot
router.post('/:farmId/snapshot', validateSnapshot, monitoringController.recordSnapshot);

// GET /api/monitoring/:farmId/history - Get monitoring history
router.get('/:farmId/history', validateHistoryQuery, monitoringController.getHistory);

// GET /api/monitoring/:farmId/latest - Get latest snapshot
router.get('/:farmId/latest', monitoringController.getLatestSnapshot);

// GET /api/monitoring/:farmId/summary - Get monitoring summary
router.get('/:farmId/summary', monitoringController.getSummary);

// GET /api/monitoring/:farmId/alerts - Get active alerts
router.get('/:farmId/alerts', monitoringController.getActiveAlerts);

// POST /api/monitoring/:farmId/alerts - Create manual alert
router.post('/:farmId/alerts', validateCreateAlert, monitoringController.createAlert);

// PUT /api/monitoring/alerts/:alertId/acknowledge - Acknowledge alert
router.put('/alerts/:alertId/acknowledge', monitoringController.acknowledgeAlert);

// PUT /api/monitoring/alerts/:alertId/resolve - Resolve alert
router.put('/alerts/:alertId/resolve', monitoringController.resolveAlert);

module.exports = router;
