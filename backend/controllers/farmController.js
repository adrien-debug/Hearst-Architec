/**
 * Farm Controller
 * Hearst Mining Architect
 * 
 * Handles mining farm CRUD and layout operations
 */

const farmService = require('../services/farmService');
const bitcoinService = require('../services/bitcoinService');
const logger = require('../utils/logger');

/**
 * Create new farm
 * POST /api/farms
 */
exports.createFarm = async (req, res) => {
  try {
    const userId = req.user.id; // Auth required via middleware
    const { name, location, electricityRate, pueRatio, voltage, totalCapacityMW } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Farm name is required' });
    }

    const farm = await farmService.createFarm(userId, {
      name,
      location,
      electricityRate,
      pueRatio,
      voltage,
      totalCapacityMW
    });

    logger.info('Farm created', { farmId: farm.id, name });

    res.status(201).json({
      success: true,
      data: farm
    });
  } catch (error) {
    logger.error('Create farm error', { error: error.message });
    res.status(500).json({ error: 'Failed to create farm' });
  }
};

/**
 * Get user's farms
 * GET /api/farms
 */
exports.getUserFarms = async (req, res) => {
  try {
    const userId = req.user.id;
    const farms = await farmService.getUserFarms(userId);

    res.json({
      success: true,
      data: farms,
      count: farms.length
    });
  } catch (error) {
    logger.error('Get farms error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
};

/**
 * Get farm by ID
 * GET /api/farms/:id
 */
exports.getFarmById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const farm = await farmService.getFarmById(id, userId);

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    logger.error('Get farm error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch farm' });
  }
};

/**
 * Update farm
 * PUT /api/farms/:id
 */
exports.updateFarm = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const farm = await farmService.updateFarm(id, userId, req.body);

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    logger.info('Farm updated', { farmId: id });

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    logger.error('Update farm error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to update farm' });
  }
};

/**
 * Delete farm
 * DELETE /api/farms/:id
 */
exports.deleteFarm = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await farmService.deleteFarm(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    logger.info('Farm deleted', { farmId: id });

    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  } catch (error) {
    logger.error('Delete farm error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to delete farm' });
  }
};

/**
 * Add machines to farm
 * POST /api/farms/:id/machines
 */
exports.addMachines = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { machines } = req.body;

    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      return res.status(400).json({ error: 'Machines array is required' });
    }

    const farm = await farmService.addMachinesToFarm(id, userId, machines);

    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    logger.info('Machines added to farm', { farmId: id, count: machines.length });

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    logger.error('Add machines error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to add machines' });
  }
};

/**
 * Remove machine from farm
 * DELETE /api/farms/:id/machines/:instanceId
 */
exports.removeMachine = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, instanceId } = req.params;

    const farm = await farmService.removeMachineFromFarm(id, userId, instanceId);

    if (!farm) {
      return res.status(404).json({ error: 'Farm or machine not found' });
    }

    logger.info('Machine removed from farm', { farmId: id, instanceId });

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    logger.error('Remove machine error', { error: error.message });
    res.status(500).json({ error: 'Failed to remove machine' });
  }
};

/**
 * Get farm analytics
 * GET /api/farms/:id/analytics
 */
exports.getFarmAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const networkStats = await bitcoinService.getNetworkStats();

    const analytics = await farmService.getFarmAnalytics(id, userId, {
      networkDifficulty: networkStats.difficulty.raw,
      btcPrice: networkStats.price.usd
    });

    if (!analytics) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    res.json({
      success: true,
      data: {
        ...analytics,
        networkStats: {
          btcPrice: networkStats.price.formattedUSD,
          difficulty: networkStats.difficulty.formatted,
          networkHashrate: networkStats.hashrate.formatted
        }
      }
    });
  } catch (error) {
    logger.error('Get analytics error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Save farm layout
 * POST /api/farms/:id/layouts
 */
exports.saveLayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const layout = await farmService.saveFarmLayout(id, userId, req.body);

    if (!layout) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    logger.info('Layout saved', { farmId: id, layoutId: layout.id });

    res.status(201).json({
      success: true,
      data: layout
    });
  } catch (error) {
    logger.error('Save layout error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to save layout' });
  }
};

/**
 * Get farm layouts
 * GET /api/farms/:id/layouts
 */
exports.getFarmLayouts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const layouts = await farmService.getFarmLayouts(id, userId);

    res.json({
      success: true,
      data: layouts,
      count: layouts.length
    });
  } catch (error) {
    logger.error('Get layouts error', { farmId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to get layouts' });
  }
};
