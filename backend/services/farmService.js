/**
 * Farm Service
 * Hearst Mining Architect
 * 
 * Handles mining farm CRUD operations and layout management
 */

const { getFirestore, COLLECTIONS } = require('../config/firebase');
const logger = require('../utils/logger');
const { calculateFarmMetrics, calculateCoolingRequirements, calculateElectricalRequirements } = require('../utils/miningCalculator');

// In-memory storage for mock mode
const mockFarms = new Map();
const mockLayouts = new Map();

/**
 * Create a new mining farm
 */
const createFarm = async (userId, farmData) => {
  try {
    const db = getFirestore();
    
    const farm = {
      id: `farm-${Date.now()}`,
      userId,
      name: farmData.name,
      location: farmData.location || {},
      electricityRate: farmData.electricityRate || 0.05,
      pueRatio: farmData.pueRatio || 1.2,
      voltage: farmData.voltage || 480,
      totalCapacityMW: farmData.totalCapacityMW || 0,
      machines: [],
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      mockFarms.set(farm.id, farm);
      logger.info('Farm created (mock mode)', { farmId: farm.id });
      return farm;
    }

    await db.collection(COLLECTIONS.FARMS).doc(farm.id).set(farm);
    logger.info('Farm created', { farmId: farm.id, userId });
    
    return farm;
  } catch (error) {
    logger.error('Error creating farm', { error: error.message });
    throw error;
  }
};

/**
 * Get farm by ID
 */
const getFarmById = async (farmId, userId) => {
  try {
    const db = getFirestore();
    
    if (!db) {
      const farm = mockFarms.get(farmId);
      if (farm && farm.userId === userId) return farm;
      return null;
    }

    const doc = await db.collection(COLLECTIONS.FARMS).doc(farmId).get();
    
    if (!doc.exists) return null;
    
    const farm = { id: doc.id, ...doc.data() };
    
    // Verify ownership
    if (farm.userId !== userId) {
      logger.warn('Unauthorized farm access attempt', { farmId, userId });
      return null;
    }
    
    return farm;
  } catch (error) {
    logger.error('Error fetching farm', { farmId, error: error.message });
    return null;
  }
};

/**
 * Get all farms for a user
 */
const getUserFarms = async (userId) => {
  try {
    const db = getFirestore();
    
    if (!db) {
      return Array.from(mockFarms.values()).filter(f => f.userId === userId);
    }

    const snapshot = await db
      .collection(COLLECTIONS.FARMS)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching user farms', { userId, error: error.message });
    return [];
  }
};

/**
 * Update farm
 */
const updateFarm = async (farmId, userId, updateData) => {
  try {
    const db = getFirestore();
    
    // Prevent updating protected fields
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    
    updateData.updatedAt = new Date().toISOString();

    if (!db) {
      const farm = mockFarms.get(farmId);
      if (farm && farm.userId === userId) {
        const updated = { ...farm, ...updateData };
        mockFarms.set(farmId, updated);
        return updated;
      }
      return null;
    }

    const farmRef = db.collection(COLLECTIONS.FARMS).doc(farmId);
    const doc = await farmRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return null;
    }

    await farmRef.update(updateData);
    
    const updated = await farmRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    logger.error('Error updating farm', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Delete farm
 */
const deleteFarm = async (farmId, userId) => {
  try {
    const db = getFirestore();
    
    if (!db) {
      const farm = mockFarms.get(farmId);
      if (farm && farm.userId === userId) {
        mockFarms.delete(farmId);
        return true;
      }
      return false;
    }

    const farmRef = db.collection(COLLECTIONS.FARMS).doc(farmId);
    const doc = await farmRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return false;
    }

    await farmRef.delete();
    logger.info('Farm deleted', { farmId });
    
    return true;
  } catch (error) {
    logger.error('Error deleting farm', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Add machines to farm
 */
const addMachinesToFarm = async (farmId, userId, machines) => {
  try {
    const farm = await getFarmById(farmId, userId);
    if (!farm) return null;

    const newMachines = machines.map((m, index) => ({
      ...m,
      instanceId: `${farmId}-machine-${Date.now()}-${index}`,
      addedAt: new Date().toISOString(),
      status: m.status || 'planned'
    }));

    const updatedMachines = [...(farm.machines || []), ...newMachines];
    
    return await updateFarm(farmId, userId, { machines: updatedMachines });
  } catch (error) {
    logger.error('Error adding machines to farm', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Remove machine from farm
 */
const removeMachineFromFarm = async (farmId, userId, instanceId) => {
  try {
    const farm = await getFarmById(farmId, userId);
    if (!farm) return null;

    const updatedMachines = (farm.machines || []).filter(m => m.instanceId !== instanceId);
    
    return await updateFarm(farmId, userId, { machines: updatedMachines });
  } catch (error) {
    logger.error('Error removing machine from farm', { farmId, instanceId, error: error.message });
    throw error;
  }
};

/**
 * Get farm analytics
 */
const getFarmAnalytics = async (farmId, userId, { networkDifficulty, btcPrice }) => {
  try {
    const farm = await getFarmById(farmId, userId);
    if (!farm) return null;

    const metrics = calculateFarmMetrics(farm.machines || [], {
      electricityRate: farm.electricityRate,
      networkDifficulty,
      btcPrice
    });

    const cooling = calculateCoolingRequirements(metrics.totalPower, farm.pueRatio);
    const electrical = calculateElectricalRequirements(metrics.totalPower, farm.voltage);

    return {
      farm: {
        id: farm.id,
        name: farm.name,
        location: farm.location,
        status: farm.status
      },
      metrics,
      cooling,
      electrical,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error generating farm analytics', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Save farm layout (2D/3D positions)
 */
const saveFarmLayout = async (farmId, userId, layoutData) => {
  try {
    const farm = await getFarmById(farmId, userId);
    if (!farm) return null;

    const db = getFirestore();
    
    const layout = {
      id: `layout-${farmId}-${Date.now()}`,
      farmId,
      userId,
      name: layoutData.name || 'Default Layout',
      dimensions: layoutData.dimensions || { width: 100, height: 50, depth: 10 },
      grid: layoutData.grid || { cellSize: 1, rows: 50, cols: 100 },
      placements: layoutData.placements || [],
      infrastructure: layoutData.infrastructure || {
        racks: [],
        pdu: [],
        cooling: [],
        networking: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      mockLayouts.set(layout.id, layout);
      return layout;
    }

    await db.collection(COLLECTIONS.LAYOUTS).doc(layout.id).set(layout);
    logger.info('Layout saved', { layoutId: layout.id, farmId });
    
    return layout;
  } catch (error) {
    logger.error('Error saving layout', { farmId, error: error.message });
    throw error;
  }
};

/**
 * Get farm layouts
 */
const getFarmLayouts = async (farmId, userId) => {
  try {
    const farm = await getFarmById(farmId, userId);
    if (!farm) return [];

    const db = getFirestore();
    
    if (!db) {
      return Array.from(mockLayouts.values()).filter(l => l.farmId === farmId);
    }

    const snapshot = await db
      .collection(COLLECTIONS.LAYOUTS)
      .where('farmId', '==', farmId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching layouts', { farmId, error: error.message });
    return [];
  }
};

module.exports = {
  createFarm,
  getFarmById,
  getUserFarms,
  updateFarm,
  deleteFarm,
  addMachinesToFarm,
  removeMachineFromFarm,
  getFarmAnalytics,
  saveFarmLayout,
  getFarmLayouts
};
