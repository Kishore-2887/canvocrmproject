const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  bulkDeleteEmployees,
} = require('../controllers/employeeController');

// Auth temporarily removed for production debugging
router.route('/').get(getEmployees).post(createEmployee).delete(bulkDeleteEmployees);
router.route('/:id').get(getEmployee).put(updateEmployee);

module.exports = router;
