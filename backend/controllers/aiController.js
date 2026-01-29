/**
 * AI Controller - Implantation Designer
 * Hearst Mining Architect
 */

const aiService = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * POST /api/ai/implantation
 * Generate optimal layout using AI
 */
exports.generateImplantation = async (req, res) => {
  try {
    const {
      availableObjects,
      constraints,
      targetPowerMW,
      dimensions,
      existingPlacements,
      preferences,
      model = 'auto', // 'auto' | 'gpt' | 'gemini' | 'claude'
      userPrompt = '',
      engineerProfile = 'generalist',
      engineerSkills = []
    } = req.body;

    // Validate required params
    if (!dimensions || !dimensions.width || !dimensions.depth) {
      return res.status(400).json({
        success: false,
        error: 'Dimensions requises (width, depth)'
      });
    }

    logger.info('AI Implantation request', {
      dimensions,
      targetPowerMW,
      model,
      engineerProfile,
      userPrompt: userPrompt?.substring(0, 100),
      objectCategories: Object.keys(availableObjects || {}),
      existingCount: existingPlacements?.length || 0
    });

    const result = await aiService.generateImplantation({
      availableObjects,
      constraints,
      targetPowerMW,
      dimensions,
      existingPlacements,
      preferences,
      userPrompt,
      engineerProfile,
      engineerSkills
    }, model);

    // Validate the generated placements
    const validation = aiService.validatePlacements(
      result.placements || [],
      dimensions
    );

    res.json({
      success: true,
      data: {
        ...result,
        validation
      }
    });

  } catch (error) {
    logger.error('AI Implantation error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/ai/optimize
 * Optimize existing layout
 */
exports.optimizeLayout = async (req, res) => {
  try {
    const {
      currentPlacements,
      availableObjects,
      dimensions,
      optimizationGoal = 'density' // 'density' | 'cooling' | 'maintenance' | 'cost'
    } = req.body;

    if (!currentPlacements || currentPlacements.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Placements actuels requis'
      });
    }

    logger.info('AI Optimization request', {
      placementCount: currentPlacements.length,
      goal: optimizationGoal
    });

    // Add optimization preferences based on goal
    const preferences = {
      optimizationGoal,
      preserveExisting: false,
      [optimizationGoal]: 'maximize'
    };

    const result = await aiService.generateImplantation({
      availableObjects,
      dimensions,
      existingPlacements: currentPlacements,
      preferences
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('AI Optimization error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * POST /api/ai/suggest
 * Get AI suggestions for current layout
 */
exports.getSuggestions = async (req, res) => {
  try {
    const {
      currentPlacements,
      availableObjects,
      dimensions
    } = req.body;

    logger.info('AI Suggestions request', {
      placementCount: currentPlacements?.length || 0
    });

    // Use preferences to get suggestions only
    const preferences = {
      suggestionsOnly: true,
      analyzeExisting: true
    };

    const result = await aiService.generateImplantation({
      availableObjects,
      dimensions,
      existingPlacements: currentPlacements,
      preferences
    });

    res.json({
      success: true,
      data: {
        recommendations: result.recommendations || [],
        statistics: result.statistics || {},
        potentialImprovements: result.zones || []
      }
    });

  } catch (error) {
    logger.error('AI Suggestions error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/ai/status
 * Check AI service availability
 */
exports.getStatus = async (req, res) => {
  try {
    const status = aiService.getStatus();
    
    res.json({
      success: true,
      data: {
        available: status.claude.configured || status.openai.configured || status.gemini.configured,
        providers: status
      }
    });
  } catch (error) {
    logger.error('AI Status error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
