/**
 * Layout Routes
 * Hearst Mining Architect
 * 
 * Routes for layout management
 */

const express = require('express');
const router = express.Router();
const layoutController = require('../controllers/layoutController');

// GET /api/layouts - Get all layouts
router.get('/', layoutController.getAllLayouts);

// POST /api/layouts - Create new layout
router.post('/', layoutController.createLayout);

// POST /api/layouts/import - Import layout from JSON
router.post('/import', layoutController.importLayout);

// GET /api/layouts/:id - Get layout by ID
router.get('/:id', layoutController.getLayoutById);

// PUT /api/layouts/:id - Update layout
router.put('/:id', layoutController.updateLayout);

// DELETE /api/layouts/:id - Delete layout
router.delete('/:id', layoutController.deleteLayout);

// POST /api/layouts/:id/duplicate - Duplicate layout
router.post('/:id/duplicate', layoutController.duplicateLayout);

// GET /api/layouts/:id/export - Export layout as JSON
router.get('/:id/export', layoutController.exportLayout);

// POST /api/layouts/:id/placements - Add placement
router.post('/:id/placements', layoutController.addPlacement);

// DELETE /api/layouts/:id/placements/:placementId - Remove placement
router.delete('/:id/placements/:placementId', layoutController.removePlacement);

module.exports = router;
