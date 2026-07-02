const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('./pagination');

// Generic CRUD handlers for org-scoped resources (filter always includes organizationId).
// opts: { paged: bool, sort: {}, beforeCreate: (body, req) => body, beforeUpdate: (body, req) => body }
function crudFactory(Model, opts = {}) {
  const sort = opts.sort || { createdAt: -1 };

  return {
    list: async (req, res) => {
      const filter = { organizationId: req.params.orgId };
      if (opts.paged) {
        const pageable = parsePageable(req.query);
        return res.json(await paginate(Model, filter, pageable, { sort }));
      }
      const docs = await Model.find(filter).sort(sort);
      res.json(docs);
    },

    getById: async (req, res) => {
      const doc = await Model.findOne({ _id: req.params.id, organizationId: req.params.orgId });
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`);
      res.json(doc);
    },

    create: async (req, res) => {
      let body = { ...req.body, organizationId: req.params.orgId };
      if (opts.beforeCreate) body = await opts.beforeCreate(body, req);
      const doc = await Model.create(body);
      res.status(201).json(doc);
    },

    update: async (req, res) => {
      let body = { ...req.body };
      delete body.organizationId;
      if (opts.beforeUpdate) body = await opts.beforeUpdate(body, req);
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.params.orgId },
        { $set: body },
        { new: true, runValidators: true }
      );
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`);
      res.json(doc);
    },

    remove: async (req, res) => {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, organizationId: req.params.orgId });
      if (!doc) throw new ApiError(404, `${Model.modelName} not found`);
      res.status(204).send();
    }
  };
}

module.exports = { crudFactory };
