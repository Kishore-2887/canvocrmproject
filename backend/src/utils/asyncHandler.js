/**
 * Wraps async route handlers to avoid try/catch boilerplate.
 * @param {Function} fn - Async express handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
