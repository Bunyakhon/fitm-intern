export class ToolError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export function demand(condition, code, message, status = 400) {
  if (!condition) throw new ToolError(code, message, status);
}
