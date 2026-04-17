const express = require('express');
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  getEmployee,
  updateEmployee,
  bulkDeleteEmployees,
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect, authorize('admin'));

router.route('/').get(getEmployees).post(createEmployee).delete(bulkDeleteEmployees);
router.route('/:id').get(getEmployee).put(updateEmployee);

module.exports = router;
