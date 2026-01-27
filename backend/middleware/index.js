/**
 * Middleware Index
 * Hearst Mining Architect
 */

const authMiddleware = require('./authMiddleware');
const validationMiddleware = require('./validationMiddleware');

module.exports = {
  ...authMiddleware,
  ...validationMiddleware
};
