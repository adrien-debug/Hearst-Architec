/**
 * Calculator Routes
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const calculatorController = require('../controllers/calculatorController');
const { 
  validateProfitability,
  validateMachineCalculation,
  validateComparison,
  validateInfrastructure
} = require('../middleware/validationMiddleware');

// All calculator routes are public (no auth required)
// They perform calculations without storing data

// POST /api/calculator/profitability - Calculate mining profitability
router.post('/profitability', validateProfitability, calculatorController.calculateProfitability);

// POST /api/calculator/machine - Calculate for specific machine
router.post('/machine', validateMachineCalculation, calculatorController.calculateForMachine);

// POST /api/calculator/compare - Compare multiple machines
router.post('/compare', validateComparison, calculatorController.compareMachines);

// POST /api/calculator/infrastructure - Calculate infrastructure needs
router.post('/infrastructure', validateInfrastructure, calculatorController.calculateInfrastructure);

// POST /api/calculator/power-costs - Calculate power costs breakdown
router.post('/power-costs', calculatorController.calculatePowerCostsBreakdown);

module.exports = router;
