function parsePageable(query, defaultSize = 20) {
  const page = Math.max(0, parseInt(query.page ?? '0', 10) || 0);
  const size = Math.max(1, parseInt(query.size ?? String(defaultSize), 10) || defaultSize);
  return { page, size, skip: page * size };
}

async function paginate(model, filter, { page, size, skip }, options = {}) {
  const [content, totalElements] = await Promise.all([
    model.find(filter, options.projection).sort(options.sort || { _id: -1 }).skip(skip).limit(size),
    model.countDocuments(filter)
  ]);
  return {
    content,
    page,
    size,
    totalElements,
    totalPages: Math.ceil(totalElements / size),
    first: page === 0,
    last: skip + content.length >= totalElements
  };
}

module.exports = { parsePageable, paginate };
