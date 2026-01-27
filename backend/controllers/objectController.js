/**
 * Object Controller
 * Hearst Mining Architect
 * 
 * Handles infrastructure objects (racks, PDU, cooling, networking)
 * CRUD operations with Firebase persistence
 */

const { getFirestore } = require('../config/firebase');
const logger = require('../utils/logger');

// In-memory storage for mock mode - Empty by default
let mockObjects = {
  racks: [],
  pdu: [],
  cooling: [],
  networking: [],
  containers: [],
  transformers: [],
  modules: [] // Assembled modules (container + cooling, etc.)
};

// Object subtypes with default properties
const OBJECT_SUBTYPES = {
  containers: {
    'ANTSPACE-HD5': {
      description: 'Bitmain ANTSPACE HD5 - 308 Slot Hydro Container',
      manufacturer: 'Bitmain',
      model: 'ANTSPACE HD5',
      containerType: '40ft ISO',
      // Dimensions in mm
      dimensions: { width: 12196, height: 2896, depth: 2438 },
      // Capacity
      machineSlots: 308,
      slotDistribution: { sidesCount: 2, slotsPerSide: [140, 154] },
      // Power specifications
      powerCapacityMW: 1.765,
      normalPowerKW: 1512,
      maxPowerKW: 1765,
      inputVoltage: '400V ±5%',
      frequency: '50/60Hz',
      mainSwitchAmps: 1200,
      mainSwitchCount: 4,
      ratedCurrentAmps: 700,
      ratedCurrentCount: 4,
      currentPerSlotAmps: 10,
      // Weight
      shippingWeightTons: 11,
      operatingWeightTons: 17.2,
      // Cooling
      coolingIncluded: false,
      coolingType: 'hydro',
      recommendedCooler: 'EC2-DT',
      // Flow rates
      flowRate1: { m3h: 67.2, slotsPerSide: 140, pumpFrequencyHz: 41 },
      flowRate2: { m3h: 73.9, slotsPerSide: 154, pumpFrequencyHz: 45 },
      // Connections
      connectionInterface: 'DN100 (ISO2852 PN16)',
      plateHeatExchange: 'DN100 (GB/T 9122-2010 PN16)',
      // Cable specifications
      inletCable: {
        voltageResistance: 600,
        L1: { spec: '400kcMil (185mm²)', count: 8 },
        L2: { spec: '400kcMil (185mm²)', count: 8 },
        L3: { spec: '400kcMil (185mm²)', count: 8 },
        N: { spec: '400kcMil (185mm²)', count: 4 },
        PE: { spec: '400kcMil (185mm²)', count: 4 }
      },
      // Infrastructure requirements
      transformerKVA: 3750,
      unitsPerTransformer: 2,
      groundLoadCapacityTons: 32,
      groundLevelTolerance: '±1 degree',
      craneRequiredTons: 20,
      // Certifications
      certifications: ['CCS', 'CE', 'UL'],
      safetyCertifications: [
        'NFPA 79:2021',
        'UL 508A:2018 R8.21',
        'CSA C22.2 No. 14-18',
        'ANSI/ISO 12100:2012',
        'IEC 60204 Ed 5.1 2009'
      ],
      // 3D Model reference
      boundingBox: {
        origin: 'bottom-left-front',
        x: { min: 0, max: 12196 },
        y: { min: 0, max: 2438 },
        z: { min: 0, max: 2896 }
      },
      volumeM3: 86.1,
      footprintM2: 29.7,
      // Mounting and assembly
      mountingPoints: ['top', 'side-left', 'side-right'],
      compatibleCooling: ['EC2-DT', 'dry-cooler']
    },
    'HD5': {
      description: 'High-Density 5MW Container (Generic)',
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      machineSlots: 250,
      powerCapacityMW: 5.0,
      coolingIncluded: false,
      mountingPoints: ['top', 'side-left', 'side-right'],
      compatibleCooling: ['rooftop-hvac', 'dry-cooler', 'evaporative']
    },
    'HD3': {
      description: 'High-Density 3MW Container',
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      machineSlots: 150,
      powerCapacityMW: 3.0,
      coolingIncluded: false,
      mountingPoints: ['top', 'side-left', 'side-right'],
      compatibleCooling: ['rooftop-hvac', 'dry-cooler']
    },
    'HYDRO-40': {
      description: 'Hydro Cooling Container 40ft',
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      machineSlots: 200,
      powerCapacityMW: 4.0,
      coolingIncluded: true,
      coolingType: 'hydro',
      mountingPoints: [],
      compatibleCooling: []
    },
    'IMMERSION-20': {
      description: 'Immersion Cooling Container 20ft',
      dimensions: { width: 6096, height: 2896, depth: 2438 },
      machineSlots: 80,
      powerCapacityMW: 1.5,
      coolingIncluded: true,
      coolingType: 'immersion',
      mountingPoints: [],
      compatibleCooling: []
    }
  },
  cooling: {
    'EC2-DT': {
      description: 'Bitmain EC2-DT Dry Cooler (Container Type)',
      manufacturer: 'Bitmain',
      model: 'EC2-DT',
      containerType: '40ft Container Type',
      // Dimensions in mm (matches HD5 for side-by-side placement)
      dimensions: { width: 12192, height: 2896, depth: 2438 },
      // Capacity
      heatDissipationKW: 1500,
      capacityTons: 426, // ~1500kW converted
      capacityBTU: 5118000, // 1500kW in BTU
      // Temperature
      outletWaterTemp: 35,
      outletWaterTempTolerance: 1,
      ambientTempDesign: 30,
      // Power
      powerKW: 80,
      operatingPowerKW: 80,
      inputVoltage: '400V ±5%',
      frequency: '50/60Hz',
      // Coolant
      coolantUsageM3: 2.1,
      // Weight
      shippingWeightTons: 12,
      operatingWeightTons: 13.5,
      // Noise
      noiseDbA: 75,
      noiseDistance: 15,
      noiseAmbientTemp: 25,
      // Connections
      containerInterface: 'DN100 (ISO2852 PN16)',
      drainPipe: 'DN20 (Tapered tube)',
      // Certifications
      certifications: ['CCS'],
      safetyCertifications: [
        'NFPA 79:2021',
        'UL 508A:2018 R8.21',
        'CSA C22.2 No. 14-18',
        'IEC 60204 Ed 5.1 2009'
      ],
      // 3D Model reference
      boundingBox: {
        origin: 'bottom-left-front',
        x: { min: 0, max: 12192 },
        y: { min: 0, max: 2438 },
        z: { min: 0, max: 2896 }
      },
      volumeM3: 86.1,
      footprintM2: 29.7,
      mountType: 'ground-adjacent',
      compatibleContainers: ['ANTSPACE-HD5']
    },
    'rooftop-hvac': {
      description: 'Rooftop HVAC Unit',
      dimensions: { width: 3000, height: 1500, depth: 2000 },
      capacityTons: 50,
      capacityBTU: 600000,
      powerKW: 45,
      mountType: 'top',
      weight: 1500
    },
    'dry-cooler': {
      description: 'Dry Cooler System (Generic)',
      dimensions: { width: 4000, height: 2500, depth: 1200 },
      capacityTons: 80,
      capacityBTU: 960000,
      powerKW: 25,
      mountType: 'side',
      weight: 2000
    },
    'evaporative': {
      description: 'Evaporative Cooling System',
      dimensions: { width: 3500, height: 3000, depth: 1500 },
      capacityTons: 100,
      capacityBTU: 1200000,
      powerKW: 15,
      waterConsumption: 500, // L/hour
      mountType: 'top',
      weight: 1800
    },
    'chiller': {
      description: 'Industrial Chiller Unit',
      dimensions: { width: 5000, height: 2500, depth: 2000 },
      capacityTons: 150,
      capacityBTU: 1800000,
      powerKW: 120,
      mountType: 'ground',
      weight: 5000
    }
  },
  pdu: {
    'pdu-400a': {
      description: 'PDU 3-Phase 400A',
      dimensions: { width: 600, height: 2000, depth: 300 },
      capacity: 400,
      voltage: 480,
      circuits: 42,
      phases: 3
    },
    'pdu-800a': {
      description: 'PDU 3-Phase 800A',
      dimensions: { width: 800, height: 2200, depth: 400 },
      capacity: 800,
      voltage: 480,
      circuits: 84,
      phases: 3
    },
    'busbar': {
      description: 'Busbar System',
      dimensions: { width: 12000, height: 300, depth: 200 },
      capacity: 2000,
      voltage: 480,
      phases: 3
    }
  },
  transformers: {
    'transformer-3.75mva': {
      description: 'Transformer 3.75 MVA (HD5 Compatible)',
      dimensions: { width: 2200, height: 2800, depth: 1800 },
      capacityMVA: 3.75,
      capacityKVA: 3750,
      inputVoltage: 11000,
      outputVoltage: 400,
      frequency: '50/60Hz',
      weight: 6500,
      supportsContainers: 2,
      compatibleContainers: ['ANTSPACE-HD5'],
      note: 'One transformer powers 2x ANTSPACE HD5 containers'
    },
    'transformer-2.5mva': {
      description: 'Transformer 2.5 MVA',
      dimensions: { width: 2000, height: 2500, depth: 1500 },
      capacityMVA: 2.5,
      inputVoltage: 11000,
      outputVoltage: 480,
      weight: 5000
    },
    'transformer-5mva': {
      description: 'Transformer 5 MVA',
      dimensions: { width: 2500, height: 3000, depth: 2000 },
      capacityMVA: 5.0,
      inputVoltage: 33000,
      outputVoltage: 480,
      weight: 8000
    },
    'transformer-10mva': {
      description: 'Transformer 10 MVA',
      dimensions: { width: 3500, height: 3500, depth: 2500 },
      capacityMVA: 10.0,
      inputVoltage: 33000,
      outputVoltage: 480,
      weight: 15000
    }
  },
  racks: {
    'rack-42u': {
      description: 'Server Rack 42U',
      dimensions: { width: 600, height: 2000, depth: 1000 },
      slots: 42,
      maxPowerKW: 20
    },
    'rack-48u': {
      description: 'Mining Rack 48U',
      dimensions: { width: 600, height: 2200, depth: 1200 },
      slots: 48,
      maxPowerKW: 30
    },
    'open-frame': {
      description: 'Open Frame Mining Rack',
      dimensions: { width: 600, height: 2000, depth: 800 },
      slots: 40,
      maxPowerKW: 40
    }
  },
  networking: {
    'switch-48': {
      description: '48-Port Network Switch',
      dimensions: { width: 440, height: 44, depth: 300 },
      ports: 48,
      speed: '10Gbps'
    },
    'switch-96': {
      description: '96-Port Network Switch',
      dimensions: { width: 440, height: 88, depth: 400 },
      ports: 96,
      speed: '25Gbps'
    },
    'cable-tray': {
      description: 'Cable Tray 3m',
      dimensions: { width: 3000, height: 100, depth: 300 }
    },
    'fiber-panel': {
      description: 'Fiber Patch Panel',
      dimensions: { width: 440, height: 44, depth: 200 },
      ports: 24
    }
  }
};

/**
 * Get all objects by category
 * GET /api/objects
 */
exports.getAllObjects = async (req, res) => {
  try {
    const { category } = req.query;
    
    let result = {};
    
    if (category && mockObjects[category]) {
      result[category] = mockObjects[category];
    } else {
      result = mockObjects;
    }

    const totalCount = Object.values(result).reduce(
      (sum, arr) => sum + arr.length, 0
    );

    res.json({
      success: true,
      data: result,
      count: totalCount,
      categories: Object.keys(mockObjects)
    });
  } catch (error) {
    logger.error('Get objects error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
};

/**
 * Get object by ID
 * GET /api/objects/:id
 */
exports.getObjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    for (const category of Object.keys(mockObjects)) {
      const obj = mockObjects[category].find(o => o.id === id);
      if (obj) {
        return res.json({
          success: true,
          data: obj,
          category
        });
      }
    }

    res.status(404).json({ error: 'Object not found' });
  } catch (error) {
    logger.error('Get object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch object' });
  }
};

/**
 * Create new object
 * POST /api/objects
 */
exports.createObject = async (req, res) => {
  try {
    const { category, ...objectData } = req.body;

    if (!category || !mockObjects[category]) {
      return res.status(400).json({ 
        error: 'Valid category required',
        validCategories: Object.keys(mockObjects)
      });
    }

    if (!objectData.name || !objectData.dimensions) {
      return res.status(400).json({ 
        error: 'Name and dimensions are required'
      });
    }

    const newObject = {
      id: `${category.slice(0, -1)}-${Date.now()}`,
      type: category.slice(0, -1),
      ...objectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockObjects[category].push(newObject);

    logger.info('Object created', { objectId: newObject.id, category });

    res.status(201).json({
      success: true,
      data: newObject
    });
  } catch (error) {
    logger.error('Create object error', { error: error.message });
    res.status(500).json({ error: 'Failed to create object' });
  }
};

/**
 * Update object
 * PUT /api/objects/:id
 */
exports.updateObject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    for (const category of Object.keys(mockObjects)) {
      const index = mockObjects[category].findIndex(o => o.id === id);
      if (index !== -1) {
        mockObjects[category][index] = {
          ...mockObjects[category][index],
          ...updates,
          id, // Prevent ID change
          updatedAt: new Date().toISOString()
        };

        logger.info('Object updated', { objectId: id, category });

        return res.json({
          success: true,
          data: mockObjects[category][index]
        });
      }
    }

    res.status(404).json({ error: 'Object not found' });
  } catch (error) {
    logger.error('Update object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to update object' });
  }
};

/**
 * Delete object
 * DELETE /api/objects/:id
 */
exports.deleteObject = async (req, res) => {
  try {
    const { id } = req.params;

    for (const category of Object.keys(mockObjects)) {
      const index = mockObjects[category].findIndex(o => o.id === id);
      if (index !== -1) {
        const deleted = mockObjects[category].splice(index, 1)[0];
        
        logger.info('Object deleted', { objectId: id, category });

        return res.json({
          success: true,
          message: 'Object deleted',
          data: deleted
        });
      }
    }

    res.status(404).json({ error: 'Object not found' });
  } catch (error) {
    logger.error('Delete object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to delete object' });
  }
};

/**
 * Duplicate object
 * POST /api/objects/:id/duplicate
 */
exports.duplicateObject = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    for (const category of Object.keys(mockObjects)) {
      const obj = mockObjects[category].find(o => o.id === id);
      if (obj) {
        const duplicate = {
          ...obj,
          id: `${obj.type}-${Date.now()}`,
          name: newName || `${obj.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        mockObjects[category].push(duplicate);

        logger.info('Object duplicated', { originalId: id, newId: duplicate.id });

        return res.status(201).json({
          success: true,
          data: duplicate
        });
      }
    }

    res.status(404).json({ error: 'Object not found' });
  } catch (error) {
    logger.error('Duplicate object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to duplicate object' });
  }
};

/**
 * Get object categories with counts
 * GET /api/objects/categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = Object.keys(mockObjects).map(category => ({
      name: category,
      count: mockObjects[category].length,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      subtypes: OBJECT_SUBTYPES[category] ? Object.keys(OBJECT_SUBTYPES[category]) : []
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get categories error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

/**
 * Get available subtypes for a category
 * GET /api/objects/subtypes/:category
 */
exports.getSubtypes = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!OBJECT_SUBTYPES[category]) {
      return res.status(404).json({ 
        error: 'Category not found',
        availableCategories: Object.keys(OBJECT_SUBTYPES)
      });
    }

    const subtypes = Object.entries(OBJECT_SUBTYPES[category]).map(([id, props]) => ({
      id,
      ...props
    }));

    res.json({
      success: true,
      data: subtypes,
      category
    });
  } catch (error) {
    logger.error('Get subtypes error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch subtypes' });
  }
};

/**
 * Create object from subtype template
 * POST /api/objects/from-template
 */
exports.createFromTemplate = async (req, res) => {
  try {
    const { category, subtype, name, customProps } = req.body;

    if (!category || !subtype) {
      return res.status(400).json({ 
        error: 'Category and subtype are required'
      });
    }

    if (!OBJECT_SUBTYPES[category] || !OBJECT_SUBTYPES[category][subtype]) {
      return res.status(404).json({ 
        error: 'Subtype not found',
        availableSubtypes: OBJECT_SUBTYPES[category] ? Object.keys(OBJECT_SUBTYPES[category]) : []
      });
    }

    const template = OBJECT_SUBTYPES[category][subtype];
    
    const newObject = {
      id: `${category.slice(0, -1)}-${Date.now()}`,
      name: name || template.description,
      type: category.slice(0, -1),
      subtype,
      ...template,
      ...customProps, // Allow overrides
      color: customProps?.color || '#6b7280',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockObjects[category].push(newObject);

    logger.info('Object created from template', { objectId: newObject.id, category, subtype });

    res.status(201).json({
      success: true,
      data: newObject
    });
  } catch (error) {
    logger.error('Create from template error', { error: error.message });
    res.status(500).json({ error: 'Failed to create object from template' });
  }
};

/**
 * Create assembled module (container + cooling, etc.)
 * POST /api/objects/assemble
 */
exports.assembleModule = async (req, res) => {
  try {
    const { name, baseObjectId, attachments } = req.body;

    if (!name || !baseObjectId) {
      return res.status(400).json({ 
        error: 'Name and baseObjectId are required'
      });
    }

    // Find base object
    let baseObject = null;
    let baseCategory = null;
    for (const category of Object.keys(mockObjects)) {
      const found = mockObjects[category].find(o => o.id === baseObjectId);
      if (found) {
        baseObject = found;
        baseCategory = category;
        break;
      }
    }

    if (!baseObject) {
      return res.status(404).json({ error: 'Base object not found' });
    }

    // Validate attachments
    const resolvedAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        let attObject = null;
        for (const category of Object.keys(mockObjects)) {
          const found = mockObjects[category].find(o => o.id === att.objectId);
          if (found) {
            attObject = found;
            break;
          }
        }
        if (attObject) {
          resolvedAttachments.push({
            objectId: att.objectId,
            name: attObject.name,
            mountPoint: att.mountPoint || 'top',
            offset: att.offset || { x: 0, y: 0, z: 0 }
          });
        }
      }
    }

    // Calculate combined dimensions
    let totalHeight = baseObject.dimensions.height;
    let totalPowerKW = baseObject.powerCapacityMW ? baseObject.powerCapacityMW * 1000 : 0;
    
    for (const att of resolvedAttachments) {
      for (const category of Object.keys(mockObjects)) {
        const attObj = mockObjects[category].find(o => o.id === att.objectId);
        if (attObj) {
          if (att.mountPoint === 'top') {
            totalHeight += attObj.dimensions.height;
          }
          if (attObj.powerKW) {
            totalPowerKW += attObj.powerKW;
          }
        }
      }
    }

    const assembledModule = {
      id: `module-${Date.now()}`,
      name,
      type: 'module',
      baseObject: {
        id: baseObject.id,
        name: baseObject.name,
        type: baseObject.type,
        subtype: baseObject.subtype
      },
      attachments: resolvedAttachments,
      combinedDimensions: {
        width: baseObject.dimensions.width,
        height: totalHeight,
        depth: baseObject.dimensions.depth
      },
      totalPowerKW,
      machineSlots: baseObject.machineSlots || 0,
      color: '#10b981',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockObjects.modules.push(assembledModule);

    logger.info('Module assembled', { moduleId: assembledModule.id, baseObjectId, attachments: resolvedAttachments.length });

    res.status(201).json({
      success: true,
      data: assembledModule
    });
  } catch (error) {
    logger.error('Assemble module error', { error: error.message });
    res.status(500).json({ error: 'Failed to assemble module' });
  }
};

/**
 * Get all templates (from OBJECT_SUBTYPES)
 * GET /api/objects/templates
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = [];
    
    for (const [category, subtypes] of Object.entries(OBJECT_SUBTYPES)) {
      for (const [subtypeId, template] of Object.entries(subtypes)) {
        templates.push({
          id: `${category}-${subtypeId}`,
          category,
          subtypeId,
          ...template
        });
      }
    }

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    logger.error('Get templates error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};
