/**
 * Validation Middleware
 * Hearst Mining Architect
 * 
 * Input validation and sanitization using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      errors: errors.array()
    });
    
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Profitability calculation validation
 */
const validateProfitability = [
  body('hashrateTH')
    .isFloat({ min: 0.001, max: 100000 })
    .withMessage('Hashrate must be between 0.001 and 100,000 TH/s'),
  body('powerWatts')
    .isFloat({ min: 1, max: 10000000 })
    .withMessage('Power must be between 1 and 10,000,000 watts'),
  body('electricityRate')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Electricity rate must be between $0 and $1 per kWh'),
  body('poolFeePercent')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Pool fee must be between 0% and 10%'),
  body('machineCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Machine cost must be positive'),
  body('networkDifficulty')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Network difficulty must be positive'),
  body('btcPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('BTC price must be positive'),
  handleValidationErrors
];

/**
 * Machine calculation validation
 */
const validateMachineCalculation = [
  body('machineId')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Machine ID is required'),
  body('electricityRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Electricity rate must be between $0 and $1 per kWh'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Quantity must be between 1 and 10,000'),
  handleValidationErrors
];

/**
 * Farm creation validation
 */
const validateCreateFarm = [
  body('name')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Farm name is required (1-100 characters)'),
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be under 200 characters'),
  body('electricityRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Electricity rate must be between $0 and $1 per kWh'),
  body('pueRatio')
    .optional()
    .isFloat({ min: 1, max: 3 })
    .withMessage('PUE ratio must be between 1 and 3'),
  body('voltage')
    .optional()
    .isInt({ min: 110, max: 480 })
    .withMessage('Voltage must be between 110V and 480V'),
  body('totalCapacityMW')
    .optional()
    .isFloat({ min: 0.001, max: 1000 })
    .withMessage('Capacity must be between 0.001 and 1000 MW'),
  handleValidationErrors
];

/**
 * Farm update validation
 */
const validateUpdateFarm = [
  param('id')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Farm ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Farm name must be 1-100 characters'),
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be under 200 characters'),
  body('electricityRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Electricity rate must be between $0 and $1 per kWh'),
  body('pueRatio')
    .optional()
    .isFloat({ min: 1, max: 3 })
    .withMessage('PUE ratio must be between 1 and 3'),
  handleValidationErrors
];

/**
 * Add machines validation
 */
const validateAddMachines = [
  param('id')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Farm ID is required'),
  body('machines')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Machines array required (1-1000 items)'),
  body('machines.*.machineId')
    .optional()
    .isString()
    .trim()
    .withMessage('Machine ID must be a string'),
  body('machines.*.model')
    .optional()
    .isString()
    .trim()
    .withMessage('Model must be a string'),
  body('machines.*.position')
    .optional()
    .isObject()
    .withMessage('Position must be an object'),
  handleValidationErrors
];

/**
 * Custom machine validation
 */
const validateCustomMachine = [
  body('model')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model name is required (1-100 characters)'),
  body('manufacturer')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Manufacturer must be under 50 characters'),
  body('hashrateTH')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Hashrate must be between 0.1 and 1000 TH/s'),
  body('powerWatts')
    .isFloat({ min: 100, max: 50000 })
    .withMessage('Power must be between 100 and 50,000 watts'),
  body('msrpUSD')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('MSRP must be between $0 and $1,000,000'),
  body('cooling')
    .optional()
    .isIn(['Air', 'Immersion', 'Hydro'])
    .withMessage('Cooling must be Air, Immersion, or Hydro'),
  handleValidationErrors
];

/**
 * Monitoring snapshot validation
 */
const validateSnapshot = [
  param('farmId')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Farm ID is required'),
  body('hashrate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hashrate must be positive'),
  body('workers')
    .optional()
    .isObject()
    .withMessage('Workers must be an object'),
  body('temperature')
    .optional()
    .isFloat({ min: -50, max: 200 })
    .withMessage('Temperature must be between -50°C and 200°C'),
  body('powerUsage')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Power usage must be positive'),
  handleValidationErrors
];

/**
 * Alert creation validation
 */
const validateCreateAlert = [
  param('farmId')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Farm ID is required'),
  body('type')
    .notEmpty()
    .isIn(['info', 'warning', 'critical'])
    .withMessage('Type must be info, warning, or critical'),
  body('category')
    .notEmpty()
    .isIn(['hashrate', 'temperature', 'worker', 'power', 'network', 'maintenance'])
    .withMessage('Invalid alert category'),
  body('title')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required (1-200 characters)'),
  body('message')
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message is required (1-1000 characters)'),
  handleValidationErrors
];

/**
 * Query parameter validation for history
 */
const validateHistoryQuery = [
  param('farmId')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Farm ID is required'),
  query('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be ISO8601 format'),
  query('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be ISO8601 format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateId = [
  param('id')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('ID is required'),
  handleValidationErrors
];

/**
 * Infrastructure calculation validation
 */
const validateInfrastructure = [
  body('totalPowerWatts')
    .isFloat({ min: 1000, max: 1000000000 })
    .withMessage('Total power must be between 1kW and 1GW'),
  body('pueRatio')
    .optional()
    .isFloat({ min: 1, max: 3 })
    .withMessage('PUE ratio must be between 1 and 3'),
  body('voltage')
    .optional()
    .isInt({ min: 110, max: 480 })
    .withMessage('Voltage must be between 110V and 480V'),
  handleValidationErrors
];

/**
 * Machine comparison validation
 */
const validateComparison = [
  body('machineIds')
    .isArray({ min: 1, max: 10 })
    .withMessage('1-10 machine IDs required'),
  body('machineIds.*')
    .isString()
    .trim()
    .withMessage('Machine IDs must be strings'),
  body('electricityRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Electricity rate must be between $0 and $1 per kWh'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateProfitability,
  validateMachineCalculation,
  validateCreateFarm,
  validateUpdateFarm,
  validateAddMachines,
  validateCustomMachine,
  validateSnapshot,
  validateCreateAlert,
  validateHistoryQuery,
  validateId,
  validateInfrastructure,
  validateComparison
};
