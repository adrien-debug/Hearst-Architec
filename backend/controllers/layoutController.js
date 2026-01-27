/**
 * Layout Controller
 * Hearst Mining Architect
 * 
 * Handles layout creation, saving, and management
 */

const logger = require('../utils/logger');

// In-memory storage for mock mode - Empty by default
let mockLayouts = [];

/**
 * Get all layouts
 * GET /api/layouts
 */
exports.getAllLayouts = async (req, res) => {
  try {
    const { status } = req.query;
    
    let layouts = mockLayouts;
    
    if (status) {
      layouts = layouts.filter(l => l.status === status);
    }

    res.json({
      success: true,
      data: layouts,
      count: layouts.length
    });
  } catch (error) {
    logger.error('Get layouts error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
};

/**
 * Get layout by ID
 * GET /api/layouts/:id
 */
exports.getLayoutById = async (req, res) => {
  try {
    const { id } = req.params;
    const layout = mockLayouts.find(l => l.id === id);

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json({
      success: true,
      data: layout
    });
  } catch (error) {
    logger.error('Get layout error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
};

/**
 * Create new layout
 * POST /api/layouts
 */
exports.createLayout = async (req, res) => {
  try {
    const { 
      name, 
      description,
      dimensions = { width: 30000, height: 20000, depth: 5000 },
      grid = { cellSize: 1000, rows: 20, cols: 30 }
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Layout name is required' });
    }

    const newLayout = {
      id: `layout-${Date.now()}`,
      name,
      description: description || '',
      dimensions,
      grid,
      placements: [],
      infrastructure: {
        racks: [],
        pdu: [],
        cooling: [],
        networking: [],
        containers: [],
        transformers: []
      },
      statistics: {
        totalMachines: 0,
        totalHashrateTH: 0,
        totalPowerMW: 0,
        estimatedCost: 0
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockLayouts.push(newLayout);

    logger.info('Layout created', { layoutId: newLayout.id, name });

    res.status(201).json({
      success: true,
      data: newLayout
    });
  } catch (error) {
    logger.error('Create layout error', { error: error.message });
    res.status(500).json({ error: 'Failed to create layout' });
  }
};

/**
 * Update layout
 * PUT /api/layouts/:id
 */
exports.updateLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const index = mockLayouts.findIndex(l => l.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Calculate statistics if placements changed
    if (updates.placements) {
      updates.statistics = {
        totalMachines: updates.placements.length,
        totalHashrateTH: updates.placements.reduce((sum, p) => sum + (p.hashrateTH || 0), 0),
        totalPowerMW: updates.placements.reduce((sum, p) => sum + (p.powerWatts || 0), 0) / 1000000,
        estimatedCost: updates.placements.reduce((sum, p) => sum + (p.cost || 0), 0)
      };
    }

    mockLayouts[index] = {
      ...mockLayouts[index],
      ...updates,
      id, // Prevent ID change
      updatedAt: new Date().toISOString()
    };

    logger.info('Layout updated', { layoutId: id });

    res.json({
      success: true,
      data: mockLayouts[index]
    });
  } catch (error) {
    logger.error('Update layout error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to update layout' });
  }
};

/**
 * Delete layout
 * DELETE /api/layouts/:id
 */
exports.deleteLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const index = mockLayouts.findIndex(l => l.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const deleted = mockLayouts.splice(index, 1)[0];

    logger.info('Layout deleted', { layoutId: id });

    res.json({
      success: true,
      message: 'Layout deleted',
      data: deleted
    });
  } catch (error) {
    logger.error('Delete layout error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to delete layout' });
  }
};

/**
 * Add placement to layout
 * POST /api/layouts/:id/placements
 */
exports.addPlacement = async (req, res) => {
  try {
    const { id } = req.params;
    const { objectId, objectType, position, rotation = 0 } = req.body;

    const layout = mockLayouts.find(l => l.id === id);
    
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    if (!objectId || !position) {
      return res.status(400).json({ error: 'objectId and position are required' });
    }

    const placement = {
      placementId: `placement-${Date.now()}`,
      objectId,
      objectType: objectType || 'machine',
      position,
      rotation,
      addedAt: new Date().toISOString()
    };

    layout.placements.push(placement);
    layout.updatedAt = new Date().toISOString();

    // Update statistics
    layout.statistics.totalMachines = layout.placements.filter(p => p.objectType === 'machine').length;

    logger.info('Placement added', { layoutId: id, placementId: placement.placementId });

    res.status(201).json({
      success: true,
      data: placement
    });
  } catch (error) {
    logger.error('Add placement error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to add placement' });
  }
};

/**
 * Remove placement from layout
 * DELETE /api/layouts/:id/placements/:placementId
 */
exports.removePlacement = async (req, res) => {
  try {
    const { id, placementId } = req.params;

    const layout = mockLayouts.find(l => l.id === id);
    
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const index = layout.placements.findIndex(p => p.placementId === placementId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    const removed = layout.placements.splice(index, 1)[0];
    layout.updatedAt = new Date().toISOString();

    // Update statistics
    layout.statistics.totalMachines = layout.placements.filter(p => p.objectType === 'machine').length;

    logger.info('Placement removed', { layoutId: id, placementId });

    res.json({
      success: true,
      message: 'Placement removed',
      data: removed
    });
  } catch (error) {
    logger.error('Remove placement error', { error: error.message });
    res.status(500).json({ error: 'Failed to remove placement' });
  }
};

/**
 * Duplicate layout
 * POST /api/layouts/:id/duplicate
 */
exports.duplicateLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    const layout = mockLayouts.find(l => l.id === id);
    
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const duplicate = {
      ...JSON.parse(JSON.stringify(layout)), // Deep clone
      id: `layout-${Date.now()}`,
      name: newName || `${layout.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockLayouts.push(duplicate);

    logger.info('Layout duplicated', { originalId: id, newId: duplicate.id });

    res.status(201).json({
      success: true,
      data: duplicate
    });
  } catch (error) {
    logger.error('Duplicate layout error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to duplicate layout' });
  }
};

/**
 * Export layout as JSON
 * GET /api/layouts/:id/export
 */
exports.exportLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const layout = mockLayouts.find(l => l.id === id);

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const exportData = {
      ...layout,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${layout.name.replace(/\s+/g, '-')}-layout.json"`);
    res.json(exportData);
  } catch (error) {
    logger.error('Export layout error', { layoutId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to export layout' });
  }
};

/**
 * Import layout from JSON
 * POST /api/layouts/import
 */
exports.importLayout = async (req, res) => {
  try {
    const layoutData = req.body;

    if (!layoutData.name || !layoutData.dimensions) {
      return res.status(400).json({ error: 'Invalid layout data' });
    }

    const imported = {
      ...layoutData,
      id: `layout-${Date.now()}`,
      status: 'draft',
      importedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockLayouts.push(imported);

    logger.info('Layout imported', { layoutId: imported.id, name: imported.name });

    res.status(201).json({
      success: true,
      data: imported
    });
  } catch (error) {
    logger.error('Import layout error', { error: error.message });
    res.status(500).json({ error: 'Failed to import layout' });
  }
};
