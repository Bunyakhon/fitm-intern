const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../src/services/studentProfileValidation");

test("integer profile fields reject unsafe, fractional and coerced JSON values", () => {
  const invalid = [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 2, Number.MAX_SAFE_INTEGER, 1.5, "2", true, NaN, Infinity];
  for (const value of invalid) {
    for (const normalize of [
      () => rules.normalizeProfile({ father_age: value }),
      () => rules.normalizeStudent({ year_level: value }),
      () => rules.normalizeChild("education", { graduation_year: value }),
      () => rules.normalizeChild("training", { display_order: value }),
    ]) assert.throws(normalize, error => error.status === 400);
  }
});

test("safe integers still respect PostgreSQL column bounds and draft nullability", () => {
  assert.deepEqual(rules.normalizeProfile({ father_age: 2147483647, mother_age: null }), { father_age: 2147483647, mother_age: null });
  assert.deepEqual(rules.normalizeStudent({ year_level: 4 }), { year_level: 4 });
  assert.deepEqual(rules.normalizeChild("education", { graduation_year: 9999, display_order: 0 }), { graduation_year: 9999, display_order: 0 });
  assert.throws(() => rules.normalizeProfile({ father_age: 2147483648 }), error => error.status === 400);
  assert.throws(() => rules.normalizeChild("skills", { display_order: null }), error => error.status === 400);
});
