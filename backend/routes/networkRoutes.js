/**
 * Network Routes
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');

// GET /api/network/price - Get current BTC price
router.get('/price', networkController.getBTCPrice);

// GET /api/network/difficulty - Get network difficulty
router.get('/difficulty', networkController.getNetworkDifficulty);

// GET /api/network/hashrate - Get network hashrate
router.get('/hashrate', networkController.getNetworkHashrate);

// GET /api/network/stats - Get comprehensive network stats
router.get('/stats', networkController.getNetworkStats);

// GET /api/network/fees - Get mempool/fee stats
router.get('/fees', networkController.getMempoolStats);

// POST /api/network/profitability - Get live profitability estimate
router.post('/profitability', networkController.getLiveProfitability);

module.exports = router;
