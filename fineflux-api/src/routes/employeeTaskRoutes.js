const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/employeeTaskController');

router.get('/', ctrl.getAllTasks);
router.get('/employee/:empId', ctrl.getEmployeeTasks);
router.post('/', ctrl.assignTask);
router.put('/:taskId/status', ctrl.updateTaskStatus);

module.exports = router;
