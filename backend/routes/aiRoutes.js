/**
 * AI Routes - Implantation Designer
 * Hearst Mining Architect
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * @route POST /api/ai/implantation
 * @desc Generate optimal layout using AI (Claude 4.5, GPT-4.1, or Gemini Flash)
 * @note Claude 4.5 is prioritized for complex 3D layouts (>15 objects or >3MW)
 * @body {
 *   availableObjects: { category: InfraObject[] },
 *   dimensions: { width: number, depth: number },
 *   targetPowerMW?: number,
 *   constraints?: object,
 *   existingPlacements?: array,
 *   preferences?: object,
 *   model?: 'auto' | 'claude' | 'gpt' | 'gemini'
 * }
 */
router.post('/implantation', aiController.generateImplantation);

/**
 * @route POST /api/ai/optimize
 * @desc Optimize existing layout
 * @body {
 *   currentPlacements: array,
 *   availableObjects: object,
 *   dimensions: { width: number, depth: number },
 *   optimizationGoal?: 'density' | 'cooling' | 'maintenance' | 'cost'
 * }
 */
router.post('/optimize', aiController.optimizeLayout);

/**
 * @route POST /api/ai/suggest
 * @desc Get AI suggestions for current layout
 */
router.post('/suggest', aiController.getSuggestions);

/**
 * @route GET /api/ai/status
 * @desc Check AI service availability
 */
router.get('/status', aiController.getStatus);

module.exports = router;
