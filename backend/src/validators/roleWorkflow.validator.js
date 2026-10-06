class WorkflowError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function uuid(value, field = "id") {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new WorkflowError(`${field} must be a valid UUID`);
  return value;
}
function object(body, allowed, { empty = false } = {}) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !allowed.includes(key)) ||
    (!empty && !Object.keys(body).length)
  )
    throw new WorkflowError("Invalid or unsupported payload fields");
  return body;
}
function text(value, name, max = 255) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new WorkflowError(
      `${name} must be non-empty text (maximum ${max} characters)`,
    );
  return value.trim();
}
function decisionPayload(body, decision) {
  object(body, ["reason"], { empty: true });
  const reason = body.reason == null ? null : text(body.reason, "reason", 2000);
  if (decision === "reject" && !reason)
    throw new WorkflowError("A rejection reason is required");
  return reason;
}
function teacherUpdate(body, own = false) {
  object(
    body,
    own
      ? ["first_name", "last_name", "email", "password"]
      : ["first_name", "last_name", "email", "major", "department", "password"],
  );
  const values = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "password") {
      if (
        typeof value !== "string" ||
        value.length < 8 ||
        Buffer.byteLength(value, "utf8") > 72
      )
        throw new WorkflowError(
          "Password must have at least 8 characters and at most 72 UTF-8 bytes",
        );
      values.password = value;
    } else if (key === "major" && value === null) values.major = null;
    else values[key] = text(value, key, key === "email" ? 254 : 255);
  }
  if (values.email) {
    values.email = values.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      throw new WorkflowError("Email is invalid");
  }
  return values;
}
function page(query = {}) {
  const limit = query.limit === undefined ? 25 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0
  )
    throw new WorkflowError("Invalid pagination");
  return { limit, offset };
}
module.exports = {
  WorkflowError,
  uuid,
  object,
  text,
  decisionPayload,
  teacherUpdate,
  page,
};
