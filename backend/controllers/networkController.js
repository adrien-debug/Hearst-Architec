/**
 * Network Controller
 * Hearst Mining Architect
 * 
 * Handles Bitcoin network data endpoints
 */

const bitcoinService = require('../services/bitcoinService');
const logger = require('../utils/logger');

/**
 * Get current BTC price
 * GET /api/network/price
 */
exports.getBTCPrice = async (req, res) => {
  try {
    const price = await bitcoinService.getBTCPrice();

    res.json({
      success: true,
      data: {
        usd: price,
        formattedUSD: `$${price.toLocaleString()}`,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get price error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch price' });
  }
};

/**
 * Get network difficulty
 * GET /api/network/difficulty
 */
exports.getNetworkDifficulty = async (req, res) => {
  try {
    const difficulty = await bitcoinService.getNetworkDifficulty();

    res.json({
      success: true,
      data: {
        raw: difficulty,
        formatted: `${(difficulty / 1e12).toFixed(2)}T`,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get difficulty error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch difficulty' });
  }
};

/**
 * Get network hashrate
 * GET /api/network/hashrate
 */
exports.getNetworkHashrate = async (req, res) => {
  try {
    const hashrate = await bitcoinService.getNetworkHashrate();

    res.json({
      success: true,
      data: {
        raw: hashrate,
        formatted: `${(hashrate / 1e18).toFixed(2)} EH/s`,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get hashrate error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch hashrate' });
  }
};

/**
 * Get comprehensive network stats
 * GET /api/network/stats
 */
exports.getNetworkStats = async (req, res) => {
  try {
    const stats = await bitcoinService.getNetworkStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get network stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch network stats' });
  }
};

/**
 * Get mempool/fee stats
 * GET /api/network/fees
 */
exports.getMempoolStats = async (req, res) => {
  try {
    const stats = await bitcoinService.getMempoolStats();

    if (!stats) {
      return res.status(503).json({ error: 'Mempool data unavailable' });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get mempool stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch mempool stats' });
  }
};

/**
 * Get live profitability estimate
 * POST /api/network/profitability
 */
exports.getLiveProfitability = async (req, res) => {
  try {
    const { hashrateTH, powerWatts, electricityRate = 0.05 } = req.body;

    if (!hashrateTH || !powerWatts) {
      return res.status(400).json({ 
        error: 'Hashrate and power consumption are required' 
      });
    }

    const profitability = await bitcoinService.getLiveProfitability(
      hashrateTH,
      powerWatts,
      electricityRate
    );

    res.json({
      success: true,
      data: profitability
    });
  } catch (error) {
    logger.error('Get profitability error', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate profitability' });
  }
};
