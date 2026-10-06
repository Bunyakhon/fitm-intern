function createCoopProjectAdvisorController(service) {
  const action = fn => async (req, res) => {
    try { return res.json(await fn(req)); }
    catch (error) {
      const missingSchema = error.parent?.code === "42P01";
      const status = missingSchema ? 503 : [400, 403, 404, 409].includes(error.status) ? error.status
        : error.name === "SequelizeUniqueConstraintError" || ["40001", "40P01"].includes(error.parent?.code) ? 409 : 500;
      return res.status(status).json({ message: missingSchema ? "Project advisor requests are unavailable until migration 014 is applied"
        : error.status === status ? error.message : status === 409 ? "Conflicting update; refresh and try again" : "Unable to complete project advisor operation" });
    }
  };
  return {
    read: action(req => service.read(req.user.id)),
    select: action(req => service.select(req.user.id, req.body)),
    list: action(req => service.list(req.user.id, req.query)),
    accept: action(req => service.decide(req.user.id, req.params.id, "accept", req.body)),
    reject: action(req => service.decide(req.user.id, req.params.id, "reject", req.body)),
  };
}
module.exports = { createCoopProjectAdvisorController };
