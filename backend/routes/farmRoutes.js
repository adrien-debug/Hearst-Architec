/**
 * Farm Routes
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farmController');
const { demoMode } = require('../middleware/authMiddleware');
const { 
  validateCreateFarm, 
  validateUpdateFarm, 
  validateAddMachines,
  validateId 
} = require('../middleware/validationMiddleware');

// All farm routes require authentication (or demo mode in dev)
router.use(demoMode);

// POST /api/farms - Create new farm
router.post('/', validateCreateFarm, farmController.createFarm);

// GET /api/farms - Get user's farms
router.get('/', farmController.getUserFarms);

// GET /api/farms/:id - Get farm by ID
router.get('/:id', validateId, farmController.getFarmById);

// PUT /api/farms/:id - Update farm
router.put('/:id', validateUpdateFarm, farmController.updateFarm);

// DELETE /api/farms/:id - Delete farm
router.delete('/:id', validateId, farmController.deleteFarm);

// POST /api/farms/:id/machines - Add machines to farm
router.post('/:id/machines', validateAddMachines, farmController.addMachines);

// DELETE /api/farms/:id/machines/:instanceId - Remove machine from farm
router.delete('/:id/machines/:instanceId', farmController.removeMachine);

// GET /api/farms/:id/analytics - Get farm analytics
router.get('/:id/analytics', validateId, farmController.getFarmAnalytics);

// POST /api/farms/:id/layouts - Save farm layout
router.post('/:id/layouts', validateId, farmController.saveLayout);

// GET /api/farms/:id/layouts - Get farm layouts
router.get('/:id/layouts', validateId, farmController.getFarmLayouts);

module.exports = router;
