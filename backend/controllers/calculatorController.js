/**
 * Calculator Controller
 * Hearst Mining Architect
 * 
 * Handles mining profitability calculations
 */

const { 
  calculateProfitability, 
  calculatePowerCosts,
  calculateCoolingRequirements,
  calculateElectricalRequirements
} = require('../utils/miningCalculator');
const bitcoinService = require('../services/bitcoinService');
const machineService = require('../services/machineService');
const logger = require('../utils/logger');

/**
 * Calculate profitability for given parameters
 * POST /api/calculator/profitability
 */
exports.calculateProfitability = async (req, res) => {
  try {
    const {
      hashrateTH,
      powerWatts,
      electricityRate,
      poolFeePercent = 2,
      machineCost = 0,
      networkDifficulty,
      btcPrice
    } = req.body;

    // Validation
    if (!hashrateTH || hashrateTH <= 0) {
      return res.status(400).json({ 
        error: 'Invalid hashrate. Must be greater than 0 TH/s' 
      });
    }

    if (!powerWatts || powerWatts <= 0) {
      return res.status(400).json({ 
        error: 'Invalid power consumption. Must be greater than 0 watts' 
      });
    }

    if (!electricityRate || electricityRate < 0) {
      return res.status(400).json({ 
        error: 'Invalid electricity rate. Must be >= 0 USD/kWh' 
      });
    }

    // Get live data if not provided
    let difficulty = networkDifficulty;
    let price = btcPrice;

    if (!difficulty || !price) {
      const networkStats = await bitcoinService.getNetworkStats();
      difficulty = difficulty || networkStats.difficulty.raw;
      price = price || networkStats.price.usd;
    }

    const result = calculateProfitability({
      hashrateTH,
      powerWatts,
      electricityRate,
      networkDifficulty: difficulty,
      btcPrice: price,
      poolFeePercent,
      machineCost
    });

    logger.info('Profitability calculated', { 
      hashrateTH, 
      dailyProfit: result.profit.daily 
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Calculate profitability error', { error: error.message });
    res.status(500).json({ error: 'Calculation failed' });
  }
};

/**
 * Calculate profitability for a specific machine model
 * POST /api/calculator/machine
 */
exports.calculateForMachine = async (req, res) => {
  try {
    const { machineId, electricityRate, quantity = 1 } = req.body;

    if (!machineId) {
      return res.status(400).json({ error: 'Machine ID required' });
    }

    const machine = await machineService.getMachineById(machineId);

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const networkStats = await bitcoinService.getNetworkStats();

    const result = calculateProfitability({
      hashrateTH: machine.hashrateTH * quantity,
      powerWatts: machine.powerWatts * quantity,
      electricityRate: electricityRate || 0.05,
      networkDifficulty: networkStats.difficulty.raw,
      btcPrice: networkStats.price.usd,
      machineCost: (machine.msrpUSD || 0) * quantity
    });

    res.json({
      success: true,
      data: {
        machine: {
          id: machine.id,
          model: machine.model,
          manufacturer: machine.manufacturer,
          quantity
        },
        networkStats: {
          btcPrice: networkStats.price.formattedUSD,
          difficulty: networkStats.difficulty.formatted
        },
        profitability: result
      }
    });
  } catch (error) {
    logger.error('Calculate for machine error', { error: error.message });
    res.status(500).json({ error: 'Calculation failed' });
  }
};

/**
 * Compare multiple machines
 * POST /api/calculator/compare
 */
exports.compareMachines = async (req, res) => {
  try {
    const { machineIds, electricityRate = 0.05 } = req.body;

    if (!machineIds || !Array.isArray(machineIds) || machineIds.length === 0) {
      return res.status(400).json({ error: 'Machine IDs array required' });
    }

    if (machineIds.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 machines for comparison' });
    }

    const networkStats = await bitcoinService.getNetworkStats();
    const results = [];

    for (const machineId of machineIds) {
      const machine = await machineService.getMachineById(machineId);
      
      if (machine) {
        const profitability = calculateProfitability({
          hashrateTH: machine.hashrateTH,
          powerWatts: machine.powerWatts,
          electricityRate,
          networkDifficulty: networkStats.difficulty.raw,
          btcPrice: networkStats.price.usd,
          machineCost: machine.msrpUSD || 0
        });

        results.push({
          machine: {
            id: machine.id,
            model: machine.model,
            manufacturer: machine.manufacturer,
            hashrateTH: machine.hashrateTH,
            powerWatts: machine.powerWatts,
            efficiency: machine.efficiency,
            msrpUSD: machine.msrpUSD
          },
          profitability
        });
      }
    }

    // Sort by daily profit
    results.sort((a, b) => b.profitability.profit.daily - a.profitability.profit.daily);

    res.json({
      success: true,
      data: {
        electricityRate,
        networkStats: {
          btcPrice: networkStats.price.formattedUSD,
          difficulty: networkStats.difficulty.formatted
        },
        comparison: results,
        bestValue: results[0]?.machine.id || null
      }
    });
  } catch (error) {
    logger.error('Compare machines error', { error: error.message });
    res.status(500).json({ error: 'Comparison failed' });
  }
};

/**
 * Calculate infrastructure requirements
 * POST /api/calculator/infrastructure
 */
exports.calculateInfrastructure = async (req, res) => {
  try {
    const { totalPowerWatts, pueRatio = 1.2, voltage = 480 } = req.body;

    if (!totalPowerWatts || totalPowerWatts <= 0) {
      return res.status(400).json({ error: 'Total power consumption required' });
    }

    const cooling = calculateCoolingRequirements(totalPowerWatts, pueRatio);
    const electrical = calculateElectricalRequirements(totalPowerWatts, voltage);

    res.json({
      success: true,
      data: {
        cooling,
        electrical,
        summary: {
          miningPowerKW: Math.round(totalPowerWatts / 1000),
          totalPowerWithCoolingKW: cooling.totalPowerWithCoolingKW,
          transformerNeeded: `${electrical.transformerSizeKVA} kVA`,
          coolingTons: cooling.tonsOfCooling
        }
      }
    });
  } catch (error) {
    logger.error('Calculate infrastructure error', { error: error.message });
    res.status(500).json({ error: 'Calculation failed' });
  }
};

/**
 * Calculate power costs breakdown
 * POST /api/calculator/power-costs
 */
exports.calculatePowerCostsBreakdown = async (req, res) => {
  try {
    const { powerWatts, electricityRate } = req.body;

    if (!powerWatts || !electricityRate) {
      return res.status(400).json({ error: 'Power and electricity rate required' });
    }

    const daily = calculatePowerCosts(powerWatts, electricityRate, 'daily');
    const monthly = calculatePowerCosts(powerWatts, electricityRate, 'monthly');
    const yearly = calculatePowerCosts(powerWatts, electricityRate, 'yearly');

    res.json({
      success: true,
      data: {
        powerWatts,
        powerKW: powerWatts / 1000,
        electricityRate,
        costs: { daily, monthly, yearly }
      }
    });
  } catch (error) {
    logger.error('Calculate power costs error', { error: error.message });
    res.status(500).json({ error: 'Calculation failed' });
  }
};
