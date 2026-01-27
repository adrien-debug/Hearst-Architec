/**
 * Monitoring Controller
 * Hearst Mining Architect
 * 
 * Handles monitoring and alerts
 */

const monitoringService = require('../services/monitoringService');
const farmService = require('../services/farmService');
const logger = require('../utils/logger');

/**
 * Record monitoring snapshot
 * POST /api/monitoring/:farmId/snapshot
 */
exports.recordSnapshot = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const snapshot = await monitoringService.recordSnapshot(farmId, req.body);

    // Check thresholds if configured
    if (req.body.thresholds) {
      await monitoringService.checkThresholds(farmId, req.body, req.body.thresholds);
    }

    res.status(201).json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Record snapshot error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to record snapshot' });
  }
};

/**
 * Get monitoring history
 * GET /api/monitoring/:farmId/history
 */
exports.getHistory = async (req, res) => {
  try {
    const { farmId } = req.params;
    const { startTime, endTime, limit = 100 } = req.query;
    const userId = req.user.id;

    // Verify farm ownership
    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const history = await monitoringService.getMonitoringHistory(farmId, {
      startTime,
      endTime,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    logger.error('Get history error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to get history' });
  }
};

/**
 * Get latest snapshot
 * GET /api/monitoring/:farmId/latest
 */
exports.getLatestSnapshot = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.id;

    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const snapshot = await monitoringService.getLatestSnapshot(farmId);

    res.json({
      success: true,
      data: snapshot
    });
  } catch (error) {
    logger.error('Get latest error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to get latest snapshot' });
  }
};

/**
 * Get monitoring summary
 * GET /api/monitoring/:farmId/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const { farmId } = req.params;
    const { period = '24h' } = req.query;
    const userId = req.user.id;

    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const summary = await monitoringService.getMonitoringSummary(farmId, period);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get summary error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to get summary' });
  }
};

/**
 * Get active alerts
 * GET /api/monitoring/:farmId/alerts
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.id;

    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const alerts = await monitoringService.getActiveAlerts(farmId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    logger.error('Get alerts error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
};

/**
 * Create manual alert
 * POST /api/monitoring/:farmId/alerts
 */
exports.createAlert = async (req, res) => {
  try {
    const { farmId } = req.params;
    const userId = req.user.id;

    const farm = await farmService.getFarmById(farmId, userId);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const { type, category, title, message } = req.body;

    if (!type || !category || !title || !message) {
      return res.status(400).json({ 
        error: 'Type, category, title, and message are required' 
      });
    }

    const alert = await monitoringService.createAlert(farmId, req.body);

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Create alert error', { farmId: req.params.farmId, error: error.message });
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

/**
 * Acknowledge alert
 * PUT /api/monitoring/alerts/:alertId/acknowledge
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await monitoringService.acknowledgeAlert(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info('Alert acknowledged', { alertId });

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Acknowledge alert error', { alertId: req.params.alertId, error: error.message });
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
};

/**
 * Resolve alert
 * PUT /api/monitoring/alerts/:alertId/resolve
 */
exports.resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution } = req.body;

    const alert = await monitoringService.resolveAlert(alertId, resolution || '');

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    logger.info('Alert resolved', { alertId });

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Resolve alert error', { alertId: req.params.alertId, error: error.message });
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
};
