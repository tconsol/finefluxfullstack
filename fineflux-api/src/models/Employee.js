const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  empId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  role: { type: String, required: true },
  department: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, match: /^\+?[0-9]{7,15}$/ },
  emailId: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  profileImageUrl: String,
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  salary: Number,
  shiftTiming: {
    start: { type: String, match: /^[0-2][0-9]:[0-5][0-9]$/ },
    end: { type: String, match: /^[0-2][0-9]:[0-5][0-9]$/ }
  },
  address: {
    line1: String, line2: String, city: String, state: String, postalCode: String, country: String
  },
  emergencyContact: {
    name: String, phone: String, relationship: String
  },
  joinedDate: { type: Date, default: Date.now }
}, { timestamps: true });

employeeSchema.index({ organizationId: 1, username: 1 }, { unique: true });

require('./jsonPlugin').applyJsonTransform(employeeSchema, ['passwordHash']);

module.exports = mongoose.model('Employee', employeeSchema, 'employees');
