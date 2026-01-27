/**
 * Machine Controller
 * Hearst Mining Architect
 * 
 * Handles ASIC machine catalog operations
 */

const machineService = require('../services/machineService');
const logger = require('../utils/logger');

/**
 * Get all machines in catalog
 * GET /api/machines
 */
exports.getAllMachines = async (req, res) => {
  try {
    const machines = await machineService.getMachineCatalog();
    
    res.json({
      success: true,
      data: machines,
      count: machines.length
    });
  } catch (error) {
    logger.error('Get machines error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

/**
 * Get machine by ID
 * GET /api/machines/:id
 */
exports.getMachineById = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await machineService.getMachineById(id);
    
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    res.json({
      success: true,
      data: machine
    });
  } catch (error) {
    logger.error('Get machine error', { machineId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
};

/**
 * Filter machines by criteria
 * GET /api/machines/filter
 */
exports.filterMachines = async (req, res) => {
  try {
    const { 
      minHashrate, 
      maxHashrate, 
      maxEfficiency, 
      manufacturer,
      cooling,
      minPrice,
      maxPrice 
    } = req.query;

    let machines = await machineService.getMachineCatalog();

    // Apply filters
    if (minHashrate) {
      machines = machines.filter(m => m.hashrateTH >= parseFloat(minHashrate));
    }
    if (maxHashrate) {
      machines = machines.filter(m => m.hashrateTH <= parseFloat(maxHashrate));
    }
    if (maxEfficiency) {
      machines = machines.filter(m => m.efficiency <= parseFloat(maxEfficiency));
    }
    if (manufacturer) {
      machines = machines.filter(m => 
        m.manufacturer.toLowerCase() === manufacturer.toLowerCase()
      );
    }
    if (cooling) {
      machines = machines.filter(m => 
        m.cooling.toLowerCase() === cooling.toLowerCase()
      );
    }
    if (minPrice) {
      machines = machines.filter(m => m.msrpUSD >= parseFloat(minPrice));
    }
    if (maxPrice) {
      machines = machines.filter(m => m.msrpUSD <= parseFloat(maxPrice));
    }

    res.json({
      success: true,
      data: machines,
      count: machines.length,
      filters: { minHashrate, maxHashrate, maxEfficiency, manufacturer, cooling, minPrice, maxPrice }
    });
  } catch (error) {
    logger.error('Filter machines error', { error: error.message });
    res.status(500).json({ error: 'Failed to filter machines' });
  }
};

/**
 * Get machines sorted by efficiency
 * GET /api/machines/by-efficiency
 */
exports.getMachinesByEfficiency = async (req, res) => {
  try {
    const { maxEfficiency = 30 } = req.query;
    const machines = await machineService.getMachinesByEfficiency(parseFloat(maxEfficiency));
    
    res.json({
      success: true,
      data: machines,
      count: machines.length
    });
  } catch (error) {
    logger.error('Get by efficiency error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

/**
 * Get machines sorted by hashrate
 * GET /api/machines/by-hashrate
 */
exports.getMachinesByHashrate = async (req, res) => {
  try {
    const { minHashrate = 0, maxHashrate = Infinity } = req.query;
    const machines = await machineService.getMachinesByHashrate(
      parseFloat(minHashrate), 
      parseFloat(maxHashrate)
    );
    
    res.json({
      success: true,
      data: machines,
      count: machines.length
    });
  } catch (error) {
    logger.error('Get by hashrate error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

/**
 * Get manufacturers list
 * GET /api/machines/manufacturers
 */
exports.getManufacturers = async (req, res) => {
  try {
    const machines = await machineService.getMachineCatalog();
    const manufacturers = [...new Set(machines.map(m => m.manufacturer))];
    
    const stats = manufacturers.map(manufacturer => ({
      name: manufacturer,
      machineCount: machines.filter(m => m.manufacturer === manufacturer).length,
      avgHashrate: Math.round(
        machines.filter(m => m.manufacturer === manufacturer)
          .reduce((sum, m) => sum + m.hashrateTH, 0) / 
        machines.filter(m => m.manufacturer === manufacturer).length
      ),
      avgEfficiency: Math.round(
        machines.filter(m => m.manufacturer === manufacturer)
          .reduce((sum, m) => sum + m.efficiency, 0) / 
        machines.filter(m => m.manufacturer === manufacturer).length * 10
      ) / 10
    }));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get manufacturers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  }
};

/**
 * Add custom machine
 * POST /api/machines/custom
 */
exports.addCustomMachine = async (req, res) => {
  try {
    const { 
      model, 
      manufacturer, 
      hashrateTH, 
      powerWatts, 
      msrpUSD,
      dimensions,
      cooling = 'Air'
    } = req.body;

    // Validation
    if (!model || !hashrateTH || !powerWatts) {
      return res.status(400).json({ 
        error: 'Model, hashrate, and power consumption are required' 
      });
    }

    const efficiency = powerWatts / hashrateTH;

    const machineData = {
      model,
      manufacturer: manufacturer || 'Custom',
      hashrateTH,
      powerWatts,
      efficiency: Math.round(efficiency * 10) / 10,
      algorithm: 'SHA-256',
      msrpUSD: msrpUSD || 0,
      dimensions: dimensions || { width: 400, height: 195, depth: 290 },
      cooling,
      status: 'available'
    };

    const machine = await machineService.addCustomMachine(machineData);
    
    logger.info('Custom machine added', { machineId: machine.id });

    res.status(201).json({
      success: true,
      data: machine
    });
  } catch (error) {
    logger.error('Add custom machine error', { error: error.message });
    res.status(500).json({ error: 'Failed to add machine' });
  }
};

/**
 * Seed default catalog
 * POST /api/machines/seed
 */
exports.seedCatalog = async (req, res) => {
  try {
    await machineService.seedMachineCatalog();
    const machines = await machineService.getMachineCatalog();
    
    res.json({
      success: true,
      message: 'Catalog seeded successfully',
      count: machines.length
    });
  } catch (error) {
    logger.error('Seed catalog error', { error: error.message });
    res.status(500).json({ error: 'Failed to seed catalog' });
  }
};
