/**
 * Object Controller
 * Hearst Mining Architect
 * 
 * Handles infrastructure objects (racks, PDU, cooling, networking)
 * ⚠️ RÈGLE ULTIME: CRUD operations avec Supabase LIVE - JAMAIS de mock
 */

const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

// Categories disponibles (pour validation)
const VALID_CATEGORIES = ['racks', 'pdu', 'cooling', 'networking', 'containers', 'transformers', 'powerblocks', 'modules'];

// Object subtypes with default properties
const OBJECT_SUBTYPES = {
  containers: {
      'ANTSPACE-HD5': {
      description: 'Bitmain ANTSPACE HD5 - 308 Slot Hydro Container',
      manufacturer: 'Bitmain',
      model: 'ANTSPACE HD5',
      containerType: '40ft ISO',
      // Dimensions in mm
      dimensions: { width: 12192, height: 2896, depth: 2438 },
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
  powerblocks: {
    'PB-16-HD5': {
      description: 'Power Block 30 MVA - 16x ANTSPACE HD5 Containers',
      manufacturer: 'Custom',
      model: 'PB-16-HD5',
      // Dimensions in mm (footprint for full power block installation)
      dimensions: { width: 25000, height: 4000, depth: 15000 },
      // Power specifications
      totalCapacityMVA: 30,
      totalCapacityMW: 28.24,
      inputVoltageHV: 33000, // 33kV primary
      outputVoltageLV: 400, // 400V secondary
      frequency: '50/60Hz',
      // Container support
      maxContainers: 16,
      containerType: 'ANTSPACE-HD5',
      powerPerContainer: 1.765, // MW
      // Transformer configuration
      transformerConfig: {
        type: 'transformer-3.75mva',
        count: 8,
        arrangement: '2x4 grid',
        containersPerTransformer: 2
      },
      // HV Switchgear
      hvSwitchgear: {
        type: 'Ring Main Unit (RMU)',
        voltage: 33000,
        panels: 10,
        incomers: 2,
        feeders: 8,
        manufacturer: 'ABB/Schneider/Siemens'
      },
      // LV Switchgear
      lvSwitchgear: {
        type: 'Low Voltage Distribution Board',
        voltage: 400,
        busbars: 8,
        mainBreakersAmps: 4000,
        outgoingBreakersAmps: 1200,
        manufacturer: 'ABB/Schneider/Siemens'
      },
      // Cabling
      cabling: {
        hvCableType: 'XLPE 33kV 3x240mm²',
        lvCableType: 'XLPE 0.6/1kV 4x400mm²',
        hvCableLengthM: 500,
        lvCableLengthPerContainerM: 50
      },
      // Protection
      protection: {
        hvProtection: ['Overcurrent', 'Earth Fault', 'Differential'],
        lvProtection: ['MCCB', 'ACB', 'Surge Protection'],
        earthingSystem: 'TN-S',
        lightningProtection: true
      },
      // Auxiliary systems
      auxiliary: {
        scadaMonitoring: true,
        powerMetering: 'Smart Meters per feeder',
        ups: '10kVA for control systems',
        emergencyGenerator: 'Optional 100kVA'
      },
      // Physical
      weightTons: 120,
      footprintM2: 375,
      clearanceRequiredM: 3,
      // Installation
      installationTime: '8-12 weeks',
      craneRequiredTons: 50,
      foundationType: 'Reinforced concrete pad',
      // Certifications
      certifications: ['IEC 61439', 'IEC 62271', 'IEEE C57'],
      // Cost estimate (reference only)
      estimatedCostUSD: 1500000
    },
    'PB-8-HD5': {
      description: 'Power Block 15 MVA - 8x ANTSPACE HD5 Containers',
      manufacturer: 'Custom',
      model: 'PB-8-HD5',
      dimensions: { width: 15000, height: 4000, depth: 12000 },
      totalCapacityMVA: 15,
      totalCapacityMW: 14.12,
      inputVoltageHV: 33000,
      outputVoltageLV: 400,
      frequency: '50/60Hz',
      maxContainers: 8,
      containerType: 'ANTSPACE-HD5',
      powerPerContainer: 1.765,
      transformerConfig: {
        type: 'transformer-3.75mva',
        count: 4,
        arrangement: '2x2 grid',
        containersPerTransformer: 2
      },
      hvSwitchgear: {
        type: 'Ring Main Unit (RMU)',
        voltage: 33000,
        panels: 6,
        incomers: 1,
        feeders: 4
      },
      lvSwitchgear: {
        type: 'Low Voltage Distribution Board',
        voltage: 400,
        busbars: 4,
        mainBreakersAmps: 2500,
        outgoingBreakersAmps: 1200
      },
      weightTons: 65,
      footprintM2: 180,
      estimatedCostUSD: 850000
    },
    'PB-32-HD5': {
      description: 'Power Block 60 MVA - 32x ANTSPACE HD5 Containers',
      manufacturer: 'Custom',
      model: 'PB-32-HD5',
      dimensions: { width: 40000, height: 4000, depth: 20000 },
      totalCapacityMVA: 60,
      totalCapacityMW: 56.48,
      inputVoltageHV: 132000, // 132kV for large installations
      outputVoltageLV: 400,
      frequency: '50/60Hz',
      maxContainers: 32,
      containerType: 'ANTSPACE-HD5',
      powerPerContainer: 1.765,
      transformerConfig: {
        type: 'transformer-3.75mva',
        count: 16,
        arrangement: '4x4 grid',
        containersPerTransformer: 2,
        note: 'Requires 132/33kV step-down transformer'
      },
      hvSwitchgear: {
        type: 'GIS (Gas Insulated Switchgear)',
        voltage: 132000,
        panels: 4
      },
      mvSwitchgear: {
        type: 'Ring Main Unit (RMU)',
        voltage: 33000,
        panels: 18,
        incomers: 2,
        feeders: 16
      },
      lvSwitchgear: {
        type: 'Low Voltage Distribution Board',
        voltage: 400,
        busbars: 16,
        mainBreakersAmps: 4000,
        outgoingBreakersAmps: 1200
      },
      weightTons: 220,
      footprintM2: 800,
      estimatedCostUSD: 3200000
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
 * ⚠️ SUPABASE LIVE - Lit depuis infrastructure_objects
 */
exports.getAllObjects = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = supabase.from('infrastructure_objects').select('*');
    
    if (category && VALID_CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Supabase query error', { error: error.message });
      throw error;
    }
    
    // Grouper par catégorie
    const result = {};
    VALID_CATEGORIES.forEach(cat => { result[cat] = []; });
    
    (data || []).forEach(obj => {
      if (result[obj.category]) {
        // Convertir format DB vers format API
        result[obj.category].push({
          id: obj.id,
          name: obj.name,
          type: obj.category.slice(0, -1), // containers -> container
          subtype: obj.subtype_id,
          dimensions: {
            width: obj.width_mm,
            height: obj.height_mm,
            depth: obj.depth_mm
          },
          color: obj.color,
          position: {
            x: obj.position_x,
            y: obj.position_y,
            z: obj.position_z
          },
          status: obj.status,
          ...obj.custom_props,
          createdAt: obj.created_at,
          updatedAt: obj.updated_at
        });
      }
    });

    const totalCount = Object.values(result).reduce(
      (sum, arr) => sum + arr.length, 0
    );

    res.json({
      success: true,
      data: category ? { [category]: result[category] } : result,
      count: totalCount,
      categories: VALID_CATEGORIES
    });
  } catch (error) {
    logger.error('Get objects error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch objects from Supabase' });
  }
};

/**
 * Get object by ID
 * GET /api/objects/:id
 */
exports.getObjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('infrastructure_objects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        type: data.category.slice(0, -1),
        subtype: data.subtype_id,
        dimensions: { width: data.width_mm, height: data.height_mm, depth: data.depth_mm },
        color: data.color,
        ...data.custom_props,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      },
      category: data.category
    });
  } catch (error) {
    logger.error('Get object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to fetch object from Supabase' });
  }
};

/**
 * Create new object
 * POST /api/objects
 * ⚠️ SUPABASE LIVE
 */
exports.createObject = async (req, res) => {
  try {
    const { category, name, dimensions, color, subtype, ...customProps } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        error: 'Valid category required',
        validCategories: VALID_CATEGORIES
      });
    }

    if (!name || !dimensions) {
      return res.status(400).json({ 
        error: 'Name and dimensions are required'
      });
    }

    const { data, error } = await supabase
      .from('infrastructure_objects')
      .insert({
        category,
        subtype_id: subtype || null,
        name,
        width_mm: dimensions.width,
        height_mm: dimensions.height,
        depth_mm: dimensions.depth,
        color: color || '#6b7280',
        custom_props: customProps,
        status: 'planned'
      })
      .select()
      .single();

    if (error) {
      logger.error('Supabase insert error', { error: error.message });
      throw error;
    }

    logger.info('Object created in Supabase', { objectId: data.id, category });

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        type: category.slice(0, -1),
        dimensions: { width: data.width_mm, height: data.height_mm, depth: data.depth_mm },
        color: data.color,
        createdAt: data.created_at
      }
    });
  } catch (error) {
    logger.error('Create object error', { error: error.message });
    res.status(500).json({ error: 'Failed to create object in Supabase' });
  }
};

/**
 * Update object
 * PUT /api/objects/:id
 * ⚠️ SUPABASE LIVE
 */
exports.updateObject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dimensions, color, ...customProps } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (color) updateData.color = color;
    if (dimensions) {
      updateData.width_mm = dimensions.width;
      updateData.height_mm = dimensions.height;
      updateData.depth_mm = dimensions.depth;
    }
    if (Object.keys(customProps).length > 0) {
      updateData.custom_props = customProps;
    }

    const { data, error } = await supabase
      .from('infrastructure_objects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Object not found' });
    }

    logger.info('Object updated in Supabase', { objectId: id });

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        dimensions: { width: data.width_mm, height: data.height_mm, depth: data.depth_mm },
        color: data.color,
        updatedAt: data.updated_at
      }
    });
  } catch (error) {
    logger.error('Update object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to update object in Supabase' });
  }
};

/**
 * Delete object
 * DELETE /api/objects/:id
 * ⚠️ SUPABASE LIVE
 */
exports.deleteObject = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('infrastructure_objects')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Object not found' });
    }

    logger.info('Object deleted from Supabase', { objectId: id });

    res.json({
      success: true,
      message: 'Object deleted',
      data: { id: data.id, name: data.name }
    });
  } catch (error) {
    logger.error('Delete object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to delete object from Supabase' });
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

    // Récupérer l'objet original depuis Supabase
    const { data: original, error: fetchError } = await supabase
      .from('infrastructure_objects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      return res.status(404).json({ error: 'Object not found' });
    }

    // Créer la copie
    const { data: duplicate, error: insertError } = await supabase
      .from('infrastructure_objects')
      .insert({
        category: original.category,
        subtype_id: original.subtype_id,
        name: newName || `${original.name} (Copy)`,
        width_mm: original.width_mm,
        height_mm: original.height_mm,
        depth_mm: original.depth_mm,
        color: original.color,
        custom_props: original.custom_props,
        status: 'planned',
        project_id: original.project_id,
        template_id: original.template_id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('Object duplicated in Supabase', { originalId: id, newId: duplicate.id });

    res.status(201).json({
      success: true,
      data: {
        id: duplicate.id,
        name: duplicate.name,
        createdAt: duplicate.created_at
      }
    });
  } catch (error) {
    logger.error('Duplicate object error', { objectId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to duplicate object in Supabase' });
  }
};

/**
 * Get object categories with counts
 * GET /api/objects/categories
 * ⚠️ SUPABASE LIVE - Compte les objets depuis la DB
 */
exports.getCategories = async (req, res) => {
  try {
    // Compter les objets par catégorie depuis Supabase
    const counts = {};
    for (const cat of VALID_CATEGORIES) {
      const { count, error } = await supabase
        .from('infrastructure_objects')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
      counts[cat] = error ? 0 : count;
    }

    const categories = VALID_CATEGORIES.map(category => ({
      name: category,
      count: counts[category] || 0,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      subtypes: OBJECT_SUBTYPES[category] ? Object.keys(OBJECT_SUBTYPES[category]) : []
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get categories error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch categories from Supabase' });
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
 * ⚠️ SUPABASE LIVE
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
    
    // Trouver le template_id dans Supabase si existant
    const { data: dbTemplate } = await supabase
      .from('infrastructure_templates')
      .select('id')
      .eq('subtype_id', subtype)
      .single();

    // Insérer dans Supabase
    const { data: newObject, error } = await supabase
      .from('infrastructure_objects')
      .insert({
        category,
        subtype_id: subtype,
        template_id: dbTemplate?.id || null,
        name: name || template.description,
        width_mm: template.dimensions?.width || 1000,
        height_mm: template.dimensions?.height || 1000,
        depth_mm: template.dimensions?.depth || 1000,
        color: customProps?.color || '#6b7280',
        custom_props: {
          ...template,
          ...customProps
        },
        status: 'planned'
      })
      .select()
      .single();

    if (error) {
      logger.error('Supabase insert error', { error: error.message });
      throw error;
    }

    logger.info('Object created from template in Supabase', { objectId: newObject.id, category, subtype });

    res.status(201).json({
      success: true,
      data: {
        id: newObject.id,
        name: newObject.name,
        type: category.slice(0, -1),
        subtype,
        dimensions: {
          width: newObject.width_mm,
          height: newObject.height_mm,
          depth: newObject.depth_mm
        },
        color: newObject.color,
        ...template,
        createdAt: newObject.created_at
      }
    });
  } catch (error) {
    logger.error('Create from template error', { error: error.message });
    res.status(500).json({ error: 'Failed to create object from template in Supabase' });
  }
};

/**
 * Helper: Find object in Supabase OR in templates
 * ⚠️ SUPABASE LIVE - Async function
 */
async function findObjectOrTemplate(objectId) {
  // First, look in Supabase infrastructure_objects
  const { data: dbObject } = await supabase
    .from('infrastructure_objects')
    .select('*')
    .eq('id', objectId)
    .single();
  
  if (dbObject) {
    return {
      object: {
        id: dbObject.id,
        name: dbObject.name,
        type: dbObject.category.slice(0, -1),
        subtype: dbObject.subtype_id,
        dimensions: {
          width: dbObject.width_mm,
          height: dbObject.height_mm,
          depth: dbObject.depth_mm
        },
        ...dbObject.custom_props
      },
      category: dbObject.category,
      isTemplate: false
    };
  }
  
  // Then, look in templates (OBJECT_SUBTYPES)
  for (const [category, subtypes] of Object.entries(OBJECT_SUBTYPES)) {
    if (subtypes[objectId]) {
      const template = subtypes[objectId];
      return {
        object: {
          id: objectId,
          name: template.description || objectId,
          type: category.slice(0, -1),
          subtype: objectId,
          ...template
        },
        category,
        isTemplate: true
      };
    }
  }
  
  return null;
}

/**
 * Create assembled module (container + cooling, etc.)
 * POST /api/objects/assemble
 * Supports both existing objects AND templates directly
 */
exports.assembleModule = async (req, res) => {
  try {
    const { name, baseObjectId, baseTemplateId, attachments, attachmentTemplates } = req.body;

    if (!name || (!baseObjectId && !baseTemplateId)) {
      return res.status(400).json({ 
        error: 'Name and baseObjectId (or baseTemplateId) are required'
      });
    }

    // Find base object (from Supabase or templates) - ASYNC
    const baseId = baseObjectId || baseTemplateId;
    const baseResult = await findObjectOrTemplate(baseId);
    
    if (!baseResult) {
      return res.status(404).json({ error: `Base object/template '${baseId}' not found` });
    }
    
    const baseObject = baseResult.object;

    // Resolve attachments (from Supabase or templates) - ASYNC
    const resolvedAttachments = [];
    const allAttachments = [
      ...(attachments || []),
      ...(attachmentTemplates || []).map(t => ({ objectId: t.templateId || t.objectId, mountPoint: t.mountPoint }))
    ];
    
    for (const att of allAttachments) {
      const attResult = await findObjectOrTemplate(att.objectId);
      if (attResult) {
        resolvedAttachments.push({
          objectId: att.objectId,
          name: attResult.object.name || attResult.object.description,
          type: attResult.object.type,
          mountPoint: att.mountPoint || 'side',
          offset: att.offset || { x: baseObject.dimensions.width + 500, y: 0, z: 0 },
          dimensions: attResult.object.dimensions,
          isTemplate: attResult.isTemplate,
          powerKW: attResult.object.powerKW || 0,
          heatDissipationKW: attResult.object.heatDissipationKW || 0
        });
      }
    }

    // Calculate combined dimensions (side by side for container-type cooling)
    let totalWidth = baseObject.dimensions.width;
    let totalHeight = baseObject.dimensions.height;
    let totalDepth = baseObject.dimensions.depth;
    let totalPowerKW = baseObject.powerCapacityMW ? baseObject.powerCapacityMW * 1000 : (baseObject.maxPowerKW || 0);
    
    // Guardrail stack : avertit en cas d’empilement incohérent "side"
    function isLogicalVerticalStack(attachments) {
      return attachments.every(att => att.mountPoint === 'top');
    }
    if (resolvedAttachments.length > 1 && !isLogicalVerticalStack(resolvedAttachments)) {
      logger.warn('Empilement vertical incohérent', { module: name, attachments: resolvedAttachments.map(a=>a.mountPoint) });
    }
    
    for (const att of resolvedAttachments) {
      if (att.mountPoint === 'top') {
        totalHeight += att.dimensions.height;
      }
      if (['side', 'side-right', 'side-left'].includes(att.mountPoint)) {
        totalWidth += att.dimensions.width;
      }
      // Add cooling power consumption (already stored in att)
      if (att.powerKW) {
        totalPowerKW += att.powerKW;
      }
    }

    // Calculate cooling capacity from attachments
    const coolingCapacityKW = resolvedAttachments.reduce((sum, att) => {
      return sum + (att.heatDissipationKW || 0);
    }, 0);

    // Insert module into Supabase infrastructure_modules
    const { data: assembledModule, error: insertError } = await supabase
      .from('infrastructure_modules')
      .insert({
        name,
        base_object_id: baseResult.isTemplate ? null : baseObject.id,
        base_template_id: baseResult.isTemplate ? baseId : null,
        combined_width_mm: totalWidth,
        combined_height_mm: totalHeight,
        combined_depth_mm: totalDepth,
        total_power_kw: totalPowerKW,
        machine_slots: baseObject.machineSlots || 0,
        cooling_capacity_kw: coolingCapacityKW,
        attachments: resolvedAttachments,
        color: '#10b981',
        status: 'planned'
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Supabase insert module error', { error: insertError.message });
      throw insertError;
    }

    logger.info('Module assembled in Supabase', { 
      moduleId: assembledModule.id, 
      baseId, 
      attachments: resolvedAttachments.length,
      fromTemplates: baseResult.isTemplate
    });

    res.status(201).json({
      success: true,
      data: {
        id: assembledModule.id,
        name: assembledModule.name,
        type: 'module',
        baseObject: {
          id: baseObject.id,
          name: baseObject.name || baseObject.description,
          type: baseObject.type,
          subtype: baseObject.subtype || baseObject.id
        },
        attachments: resolvedAttachments,
        combinedDimensions: {
          width: totalWidth,
          height: totalHeight,
          depth: totalDepth
        },
        totalPowerKW,
        machineSlots: baseObject.machineSlots || 0,
        coolingCapacityKW,
        color: '#10b981',
        createdAt: assembledModule.created_at
      }
    });
  } catch (error) {
    logger.error('Assemble module error', { error: error.message });
    res.status(500).json({ error: 'Failed to assemble module in Supabase' });
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
