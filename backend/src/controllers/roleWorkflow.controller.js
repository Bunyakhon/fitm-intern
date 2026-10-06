const {
  createRoleWorkflowService,
} = require("../services/roleWorkflow.service");
function handler(action) {
  return async (req, res) => {
    try {
      return res.json({ success: true, data: await action(req) });
    } catch (error) {
      const status = [400, 403, 404, 409].includes(error.status)
        ? error.status
        : error.name === "SequelizeUniqueConstraintError" ||
            ["40001", "40P01"].includes(error.parent?.code)
          ? 409
          : error.name === "SequelizeValidationError"
            ? 400
            : 500;
      return res
        .status(status)
        .json({
          success: false,
          message:
            error.status === status
              ? error.message
              : status === 409
                ? "Conflicting update; refresh and try again"
                : status === 400
                  ? "Invalid input"
                  : "Unable to complete workflow operation",
        });
    }
  };
}
function createRoleWorkflowController(service = createRoleWorkflowService()) {
  const roleHandler = (role, action) =>
    handler((req) => action(req, req.user.id, role));
  return {
    profile: (role) =>
      roleHandler(role, (req, id) => service.profile(role, id)),
    listRequests: (role) =>
      roleHandler(role, (req, id) => service.listRequests(role, id, req.query)),
    requestDetail: (role) =>
      roleHandler(role, (req, id) =>
        service.requestDetail(role, id, req.params.id),
      ),
    reviewRequest: (role, decision) =>
      roleHandler(role, (req, id) =>
        service.reviewRequest(role, id, req.params.id, decision, req.body),
      ),
    listJobs: handler((req) => service.listJobs(req.user.id, req.query)),
    jobDetail: handler((req) => service.jobDetail(req.user.id, req.params.id)),
    reviewJob: (decision) =>
      handler((req) =>
        service.reviewJob(req.user.id, req.params.id, decision, req.body),
      ),
    listTeachers: handler((req) =>
      service.listTeachers(req.user.id, req.query),
    ),
    updateTeacher: handler((req) =>
      service.updateTeacher(req.user.id, req.params.id, req.body),
    ),
    updateOwnProfile: handler((req) =>
      service.updateTeacher(req.user.id, req.user.id, req.body, true),
    ),
    assignProjectAdvisor: handler((req) =>
      service.assignProjectAdvisor(req.user.id, req.params.id, req.body),
    ),
  };
}
module.exports = { createRoleWorkflowController };
