/**
 * Machine Service
 * Hearst Mining Architect
 * 
 * Handles ASIC machine catalog and inventory management
 */

const { getFirestore, COLLECTIONS } = require('../config/firebase');
const logger = require('../utils/logger');

// Default ASIC catalog - Empty by default, add machines via API
const DEFAULT_MACHINE_CATALOG = [];

/**
 * Get machine catalog
 */
const getMachineCatalog = async () => {
  try {
    const db = getFirestore();
    
    if (!db) {
      logger.info('Using default machine catalog (Firebase not connected)');
      return DEFAULT_MACHINE_CATALOG;
    }

    const snapshot = await db.collection(COLLECTIONS.MACHINE_CATALOG).get();
    
    if (snapshot.empty) {
      // Seed catalog if empty
      await seedMachineCatalog();
      return DEFAULT_MACHINE_CATALOG;
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching machine catalog', { error: error.message });
    return DEFAULT_MACHINE_CATALOG;
  }
};

/**
 * Get single machine by ID
 */
const getMachineById = async (machineId) => {
  try {
    const db = getFirestore();
    
    if (!db) {
      return DEFAULT_MACHINE_CATALOG.find(m => m.id === machineId) || null;
    }

    const doc = await db.collection(COLLECTIONS.MACHINE_CATALOG).doc(machineId).get();
    
    if (!doc.exists) {
      return DEFAULT_MACHINE_CATALOG.find(m => m.id === machineId) || null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error fetching machine', { machineId, error: error.message });
    return null;
  }
};

/**
 * Seed machine catalog in Firebase
 */
const seedMachineCatalog = async () => {
  try {
    const db = getFirestore();
    if (!db) return;

    const batch = db.batch();
    
    DEFAULT_MACHINE_CATALOG.forEach(machine => {
      const ref = db.collection(COLLECTIONS.MACHINE_CATALOG).doc(machine.id);
      batch.set(ref, {
        ...machine,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    await batch.commit();
    logger.info('Machine catalog seeded successfully');
  } catch (error) {
    logger.error('Error seeding machine catalog', { error: error.message });
  }
};

/**
 * Add custom machine to catalog
 */
const addCustomMachine = async (machineData) => {
  try {
    const db = getFirestore();
    
    const machine = {
      ...machineData,
      id: machineData.id || `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true
    };

    if (!db) {
      // Add to in-memory catalog in mock mode
      DEFAULT_MACHINE_CATALOG.push(machine);
      logger.info('Custom machine added (mock mode)', { machineId: machine.id });
      return machine;
    }

    await db.collection(COLLECTIONS.MACHINE_CATALOG).doc(machine.id).set(machine);
    logger.info('Custom machine added', { machineId: machine.id });
    
    return machine;
  } catch (error) {
    logger.error('Error adding custom machine', { error: error.message });
    throw error;
  }
};

/**
 * Get machines by efficiency range
 */
const getMachinesByEfficiency = async (maxEfficiency) => {
  const catalog = await getMachineCatalog();
  return catalog
    .filter(m => m.efficiency <= maxEfficiency)
    .sort((a, b) => a.efficiency - b.efficiency);
};

/**
 * Get machines by hashrate range
 */
const getMachinesByHashrate = async (minHashrate, maxHashrate = Infinity) => {
  const catalog = await getMachineCatalog();
  return catalog
    .filter(m => m.hashrateTH >= minHashrate && m.hashrateTH <= maxHashrate)
    .sort((a, b) => b.hashrateTH - a.hashrateTH);
};

module.exports = {
  getMachineCatalog,
  getMachineById,
  addCustomMachine,
  getMachinesByEfficiency,
  getMachinesByHashrate,
  seedMachineCatalog,
  DEFAULT_MACHINE_CATALOG
};
