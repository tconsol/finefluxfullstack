const mongoose = require('mongoose');
const { dayjs, IST } = require('../config/timezone');

const taskSchema = new mongoose.Schema({
  organizationId: String,
  taskTitle: String,
  description: String,
  priority: { type: String, enum: ['Low', 'Medium', 'High'] },
  shift: String,
  assignedToEmpId: String,
  assignedToName: String,
  dueDate: { type: Date, default: () => dayjs().tz(IST).add(1, 'day').toDate() },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' }
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(taskSchema);

module.exports = mongoose.model('EmployeeTask', taskSchema, 'employee_new_tasks');
