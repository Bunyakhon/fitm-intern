function createCompanyEvaluationController(service) {
  const action = fn => async (req, res) => {
    try { return res.json(await fn(req)); }
    catch (error) {
      const missingSchema = error.parent?.code === "42P01";
      const status = missingSchema ? 503 : [400, 403, 404].includes(error.status) ? error.status : 500;
      return res.status(status).json({ message: missingSchema
        ? "Company evaluations are unavailable until migration 015 is applied"
        : error.status === status ? error.message : "ไม่สามารถดำเนินการแบบประเมินได้" });
    }
  };
  return { read: action(req => service.read(req.user.id)), save: action(req => service.save(req.user.id, req.body)) };
}
module.exports = { createCompanyEvaluationController };
