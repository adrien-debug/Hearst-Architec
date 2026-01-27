/**
 * Object Routes
 * Hearst Mining Architect
 * 
 * Routes for infrastructure objects management
 */

const express = require('express');
const router = express.Router();
const objectController = require('../controllers/objectController');

// GET /api/objects - Get all objects (optional category filter)
router.get('/', objectController.getAllObjects);

// GET /api/objects/categories - Get categories with counts and subtypes
router.get('/categories', objectController.getCategories);

// GET /api/objects/subtypes/:category - Get available subtypes for a category
router.get('/subtypes/:category', objectController.getSubtypes);

// GET /api/objects/templates - Get all templates
router.get('/templates', objectController.getAllTemplates);

// POST /api/objects/from-template - Create object from subtype template
router.post('/from-template', objectController.createFromTemplate);

// POST /api/objects/assemble - Create assembled module
router.post('/assemble', objectController.assembleModule);

// GET /api/objects/:id - Get object by ID
router.get('/:id', objectController.getObjectById);

// POST /api/objects - Create new object (custom)
router.post('/', objectController.createObject);

// PUT /api/objects/:id - Update object
router.put('/:id', objectController.updateObject);

// DELETE /api/objects/:id - Delete object
router.delete('/:id', objectController.deleteObject);

// POST /api/objects/:id/duplicate - Duplicate object
router.post('/:id/duplicate', objectController.duplicateObject);

module.exports = router;
