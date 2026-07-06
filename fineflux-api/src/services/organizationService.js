const { Organization } = require('../models');
const { parsePageable, paginate } = require('../utils/pagination');
const { ApiError } = require('../middleware/errorHandler');

async function list(query) {
  return paginate(Organization, {}, parsePageable(query));
}

async function get(id) {
  const org = await Organization.findById(id);
  if (!org) throw new ApiError(404, 'Organization not found');
  return org;
}

async function getByOrgId(organizationId) {
  const org = await Organization.findOne({ organizationId });
  if (!org) throw new ApiError(404, 'Organization not found');
  return org;
}

async function create(body) {
  if (await Organization.exists({ organizationId: body.organizationId })) {
    throw new ApiError(409, 'organizationId already exists');
  }
  return Organization.create(body);
}

async function update(id, body) {
  const org = await Organization.findByIdAndUpdate(id, { $set: body }, { new: true, runValidators: true });
  if (!org) throw new ApiError(404, 'Organization not found');
  return org;
}

async function remove(id) {
  const org = await Organization.findByIdAndDelete(id);
  if (!org) throw new ApiError(404, 'Organization not found');
}

module.exports = { list, get, getByOrgId, create, update, remove };
