/**
 * Layout Controller
 * Hearst Mining Architect
 * 
 * Handles layout creation, saving, and management
 * SUPABASE STORAGE - Real database persistence
 */

const logger = require('../utils/logger');
const { supabase } = require('../config/supabase');

// Table name in Supabase
const LAYOUTS_TABLE = 'mining_layouts';

/**
 * Get all layouts
 * GET /api/layouts
 */
exports.getAllLayouts = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data: layouts, error } = await query;

    if (error) {
      logger.error('Supabase get layouts error', { error: error.message });
      throw error;
    }

    res.json({
      success: true,
      data: layouts || [],
      count: (layouts || []).length
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
    
    const { data: layout, error } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !layout) {
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
      grid = { cellSize: 1000, rows: 20, cols: 30 },
      objects = [],
      groups = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Layout name is required' });
    }

    const newLayout = {
      name,
      description: description || '',
      dimensions,
      grid,
      objects, // 3D objects array
      groups,  // Object groups
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
      status: 'draft'
    };

    const { data: created, error } = await supabase
      .from(LAYOUTS_TABLE)
      .insert(newLayout)
      .select()
      .single();

    if (error) {
      logger.error('Supabase create layout error', { error: error.message });
      throw error;
    }

    logger.info('Layout created', { layoutId: created.id, name });

    res.status(201).json({
      success: true,
      data: created
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

    // Calculate statistics if objects changed
    if (updates.objects) {
      const containers = updates.objects.filter(o => o.type?.includes('container'));
      const transformers = updates.objects.filter(o => o.type?.includes('transformer'));
      const coolers = updates.objects.filter(o => o.type?.includes('cooler') || o.type?.includes('dry'));
      
      updates.statistics = {
        totalObjects: updates.objects.length,
        containers: containers.length,
        transformers: transformers.length,
        coolers: coolers.length,
        totalMachines: updates.placements?.length || 0,
        totalHashrateTH: updates.placements?.reduce((sum, p) => sum + (p.hashrateTH || 0), 0) || 0,
        totalPowerMW: updates.placements?.reduce((sum, p) => sum + (p.powerWatts || 0), 0) / 1000000 || 0,
        estimatedCost: updates.placements?.reduce((sum, p) => sum + (p.cost || 0), 0) || 0
      };
    }

    // Remove id from updates to prevent overwriting
    delete updates.id;
    delete updates.created_at;

    const { data: updated, error } = await supabase
      .from(LAYOUTS_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Supabase update layout error', { error: error.message });
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Layout not found' });
      }
      throw error;
    }

    logger.info('Layout updated', { layoutId: id });

    res.json({
      success: true,
      data: updated
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

    // First get the layout to return it
    const { data: layout } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const { error } = await supabase
      .from(LAYOUTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Supabase delete layout error', { error: error.message });
      throw error;
    }

    logger.info('Layout deleted', { layoutId: id });

    res.json({
      success: true,
      message: 'Layout deleted',
      data: layout
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

    // Get current layout
    const { data: layout, error: fetchError } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !layout) {
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

    const updatedPlacements = [...(layout.placements || []), placement];

    const { data: updated, error } = await supabase
      .from(LAYOUTS_TABLE)
      .update({
        placements: updatedPlacements,
        statistics: {
          ...layout.statistics,
          totalMachines: updatedPlacements.filter(p => p.objectType === 'machine').length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

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

    // Get current layout
    const { data: layout, error: fetchError } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const placements = layout.placements || [];
    const index = placements.findIndex(p => p.placementId === placementId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    const removed = placements[index];
    const updatedPlacements = placements.filter(p => p.placementId !== placementId);

    const { error } = await supabase
      .from(LAYOUTS_TABLE)
      .update({
        placements: updatedPlacements,
        statistics: {
          ...layout.statistics,
          totalMachines: updatedPlacements.filter(p => p.objectType === 'machine').length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

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

    // Get original layout
    const { data: layout, error: fetchError } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    // Create duplicate without id and timestamps
    const { id: _, created_at, updated_at, ...layoutData } = layout;
    
    const duplicate = {
      ...layoutData,
      name: newName || `${layout.name} (Copy)`,
      status: 'draft'
    };

    const { data: created, error } = await supabase
      .from(LAYOUTS_TABLE)
      .insert(duplicate)
      .select()
      .single();

    if (error) throw error;

    logger.info('Layout duplicated', { originalId: id, newId: created.id });

    res.status(201).json({
      success: true,
      data: created
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
    
    const { data: layout, error } = await supabase
      .from(LAYOUTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !layout) {
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

    // Remove any existing id and timestamps from import
    const { id, created_at, updated_at, exportedAt, ...cleanData } = layoutData;

    const imported = {
      ...cleanData,
      status: 'draft',
      imported_from: id || null
    };

    const { data: created, error } = await supabase
      .from(LAYOUTS_TABLE)
      .insert(imported)
      .select()
      .single();

    if (error) {
      logger.error('Supabase import layout error', { error: error.message });
      throw error;
    }

    logger.info('Layout imported', { layoutId: created.id, name: created.name });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    logger.error('Import layout error', { error: error.message });
    res.status(500).json({ error: 'Failed to import layout' });
  }
};
