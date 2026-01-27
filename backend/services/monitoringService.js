/**
 * Monitoring Service
 * Hearst Mining Architect
 * 
 * Handles real-time monitoring data and alerts
 */

const { getFirestore, COLLECTIONS } = require('../config/firebase');
const logger = require('../utils/logger');

// In-memory storage for mock mode
const mockMonitoring = new Map();
const mockAlerts = [];

/**
 * Record monitoring snapshot
 */
const recordSnapshot = async (farmId, snapshotData) => {
  try {
    const db = getFirestore();
    
    const snapshot = {
      id: `snapshot-${Date.now()}`,
      farmId,
      timestamp: new Date().toISOString(),
      metrics: {
        totalHashrate: snapshotData.totalHashrate || 0,
        activeWorkers: snapshotData.activeWorkers || 0,
        totalWorkers: snapshotData.totalWorkers || 0,
        temperature: snapshotData.temperature || {},
        powerConsumption: snapshotData.powerConsumption || 0,
        efficiency: snapshotData.efficiency || 0,
        poolStats: snapshotData.poolStats || {}
      },
      machineStatus: snapshotData.machineStatus || []
    };

    if (!db) {
      const key = `${farmId}-${Date.now()}`;
      mockMonitoring.set(key, snapshot);
      return snapshot;
    }

    await db.collection(COLLECTIONS.MONITORING).doc(snapshot.id).set(snapshot);
    
    return snapshot;
  } catch (error) {
    logger.error('Error recording snapshot', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Get monitoring history
 */
const getMonitoringHistory = async (farmId, options = {}) => {
  try {
    const db = getFirestore();
    const { startTime, endTime, limit = 100 } = options;

    if (!db) {
      return Array.from(mockMonitoring.values())
        .filter(s => s.farmId === farmId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    }

    let query = db
      .collection(COLLECTIONS.MONITORING)
      .where('farmId', '==', farmId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }
    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching monitoring history', { farmId, error: error.message });
    return [];
  }
};

/**
 * Get latest snapshot
 */
const getLatestSnapshot = async (farmId) => {
  try {
    const history = await getMonitoringHistory(farmId, { limit: 1 });
    return history[0] || null;
  } catch (error) {
    logger.error('Error fetching latest snapshot', { farmId, error: error.message });
    return null;
  }
};

/**
 * Create alert
 */
const createAlert = async (farmId, alertData) => {
  try {
    const db = getFirestore();
    
    const alert = {
      id: `alert-${Date.now()}`,
      farmId,
      type: alertData.type, // 'warning', 'critical', 'info'
      category: alertData.category, // 'hashrate', 'temperature', 'power', 'worker', 'pool'
      title: alertData.title,
      message: alertData.message,
      threshold: alertData.threshold,
      currentValue: alertData.currentValue,
      machineId: alertData.machineId || null,
      acknowledged: false,
      resolved: false,
      createdAt: new Date().toISOString()
    };

    if (!db) {
      mockAlerts.push(alert);
      logger.warn('Alert created (mock mode)', { alertId: alert.id, type: alert.type });
      return alert;
    }

    await db.collection(COLLECTIONS.ALERTS).doc(alert.id).set(alert);
    logger.warn('Alert created', { alertId: alert.id, type: alert.type, farmId });
    
    return alert;
  } catch (error) {
    logger.error('Error creating alert', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Get active alerts for farm
 */
const getActiveAlerts = async (farmId) => {
  try {
    const db = getFirestore();

    if (!db) {
      return mockAlerts.filter(a => a.farmId === farmId && !a.resolved);
    }

    const snapshot = await db
      .collection(COLLECTIONS.ALERTS)
      .where('farmId', '==', farmId)
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching alerts', { farmId, error: error.message });
    return [];
  }
};

/**
 * Acknowledge alert
 */
const acknowledgeAlert = async (alertId) => {
  try {
    const db = getFirestore();

    if (!db) {
      const alert = mockAlerts.find(a => a.id === alertId);
      if (alert) alert.acknowledged = true;
      return alert;
    }

    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    await alertRef.update({ 
      acknowledged: true,
      acknowledgedAt: new Date().toISOString()
    });
    
    const updated = await alertRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    logger.error('Error acknowledging alert', { alertId, error: error.message });
    throw error;
  }
};

/**
 * Resolve alert
 */
const resolveAlert = async (alertId, resolution = '') => {
  try {
    const db = getFirestore();

    if (!db) {
      const alert = mockAlerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        alert.resolution = resolution;
      }
      return alert;
    }

    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    await alertRef.update({ 
      resolved: true,
      resolution,
      resolvedAt: new Date().toISOString()
    });
    
    const updated = await alertRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    logger.error('Error resolving alert', { alertId, error: error.message });
    throw error;
  }
};

/**
 * Check thresholds and create alerts if needed
 */
const checkThresholds = async (farmId, metrics, thresholds) => {
  const alerts = [];

  // Check hashrate drop
  if (thresholds.hashrateDropPercent && metrics.hashrateDropPercent > thresholds.hashrateDropPercent) {
    alerts.push(await createAlert(farmId, {
      type: metrics.hashrateDropPercent > 20 ? 'critical' : 'warning',
      category: 'hashrate',
      title: 'Hashrate Drop Detected',
      message: `Hashrate dropped by ${metrics.hashrateDropPercent.toFixed(1)}%`,
      threshold: thresholds.hashrateDropPercent,
      currentValue: metrics.hashrateDropPercent
    }));
  }

  // Check temperature
  if (thresholds.maxTemperature && metrics.avgTemperature > thresholds.maxTemperature) {
    alerts.push(await createAlert(farmId, {
      type: metrics.avgTemperature > 85 ? 'critical' : 'warning',
      category: 'temperature',
      title: 'High Temperature Alert',
      message: `Average temperature is ${metrics.avgTemperature}°C`,
      threshold: thresholds.maxTemperature,
      currentValue: metrics.avgTemperature
    }));
  }

  // Check offline workers
  if (thresholds.maxOfflineWorkers && metrics.offlineWorkers > thresholds.maxOfflineWorkers) {
    alerts.push(await createAlert(farmId, {
      type: 'warning',
      category: 'worker',
      title: 'Workers Offline',
      message: `${metrics.offlineWorkers} workers are offline`,
      threshold: thresholds.maxOfflineWorkers,
      currentValue: metrics.offlineWorkers
    }));
  }

  return alerts;
};

/**
 * Get monitoring summary
 */
const getMonitoringSummary = async (farmId, period = '24h') => {
  try {
    const now = new Date();
    let startTime;

    switch (period) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    }

    const history = await getMonitoringHistory(farmId, { startTime, limit: 1000 });
    
    if (history.length === 0) {
      return null;
    }

    // Calculate averages and trends
    const avgHashrate = history.reduce((sum, s) => sum + s.metrics.totalHashrate, 0) / history.length;
    const avgPower = history.reduce((sum, s) => sum + s.metrics.powerConsumption, 0) / history.length;
    const avgEfficiency = history.reduce((sum, s) => sum + s.metrics.efficiency, 0) / history.length;
    
    const uptime = history.filter(s => s.metrics.activeWorkers > 0).length / history.length * 100;
    
    // Calculate trends (compare first half vs second half)
    const midpoint = Math.floor(history.length / 2);
    const firstHalf = history.slice(midpoint);
    const secondHalf = history.slice(0, midpoint);
    
    const firstAvgHashrate = firstHalf.reduce((sum, s) => sum + s.metrics.totalHashrate, 0) / firstHalf.length;
    const secondAvgHashrate = secondHalf.reduce((sum, s) => sum + s.metrics.totalHashrate, 0) / secondHalf.length;
    const hashrateTrend = firstAvgHashrate > 0 ? ((secondAvgHashrate - firstAvgHashrate) / firstAvgHashrate) * 100 : 0;

    return {
      period,
      dataPoints: history.length,
      averages: {
        hashrate: Math.round(avgHashrate * 100) / 100,
        powerConsumption: Math.round(avgPower),
        efficiency: Math.round(avgEfficiency * 100) / 100
      },
      uptime: Math.round(uptime * 100) / 100,
      trends: {
        hashrate: Math.round(hashrateTrend * 100) / 100
      },
      latest: history[0] || null,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error generating monitoring summary', { farmId, error: error.message });
    return null;
  }
};

module.exports = {
  recordSnapshot,
  getMonitoringHistory,
  getLatestSnapshot,
  createAlert,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  checkThresholds,
  getMonitoringSummary
};
