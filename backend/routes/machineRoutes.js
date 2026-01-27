/**
 * Machine Routes
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const { demoMode, requireRole } = require('../middleware/authMiddleware');
const { validateCustomMachine } = require('../middleware/validationMiddleware');

// Public routes (no auth required)

// GET /api/machines - Get all machines
router.get('/', machineController.getAllMachines);

// GET /api/machines/filter - Filter machines by criteria
router.get('/filter', machineController.filterMachines);

// GET /api/machines/by-efficiency - Get machines sorted by efficiency
router.get('/by-efficiency', machineController.getMachinesByEfficiency);

// GET /api/machines/by-hashrate - Get machines sorted by hashrate
router.get('/by-hashrate', machineController.getMachinesByHashrate);

// GET /api/machines/manufacturers - Get manufacturers list
router.get('/manufacturers', machineController.getManufacturers);

// GET /api/machines/:id - Get machine by ID (must be after /filter, /manufacturers etc.)
router.get('/:id', machineController.getMachineById);

// Protected routes (require auth)

// POST /api/machines/custom - Add custom machine (requires auth)
router.post('/custom', demoMode, validateCustomMachine, machineController.addCustomMachine);

// POST /api/machines/seed - Seed default catalog (admin only in production)
router.post('/seed', demoMode, machineController.seedCatalog);

module.exports = router;
