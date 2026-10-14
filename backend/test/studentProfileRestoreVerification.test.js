const test = require("node:test");
const assert = require("node:assert/strict");
const { expressionTree, compareMetadata, compareDetails } = require("../scripts/lib/studentProfileRestoreVerification");

test("CHECK tree comparison ignores only source offsets and retains semantic fields", () => {
  const original = "{OPEXPR :opno 523 :inputcollid 100 :constvalue 4 [10 0 0 0] :location 12}";
  assert.equal(expressionTree(original), expressionTree(original.replace(":location 12", ":location 99")));
  for (const [from, to] of [[":opno 523", ":opno 525"], [":inputcollid 100", ":inputcollid 101"], ["[10 0 0 0]", "[9 0 0 0]"]]) {
    assert.notEqual(expressionTree(original), expressionTree(original.replace(from, to)));
  }
});

test("catalog comparison allows representation differences only with a proven equivalent CHECK", () => {
  const constraint = { table_name: "fixture", name: "fixture_check", type: "c", validated: true, definition: "CHECK (score<=10)" };
  const original = { constraints: [constraint], indexes: [{ definition: "fixture index" }] };
  const restored = { ...original, constraints: [{ ...constraint, definition: "CHECK ((score <= 10))" }] };
  const proof = { table: "fixture", name: "fixture_check", classification: "EQUIVALENT" };
  assert.throws(() => compareMetadata(original, restored, []), /RESTORE_CATALOG_OBJECT_MISMATCH/);
  assert.throws(() => compareMetadata(original, restored, [{ ...proof, classification: "UNVERIFIED" }]), /RESTORE_CATALOG_OBJECT_MISMATCH/);
  assert.doesNotThrow(() => compareMetadata(original, restored, [proof]));
  assert.throws(() => compareMetadata(original, { ...restored, constraints: [{ ...restored.constraints[0], validated: false }] }, [proof]), /RESTORE_CATALOG_OBJECT_MISMATCH/);
  assert.throws(() => compareMetadata(original, { ...restored, indexes: [] }, [proof]), /RESTORE_CATALOG_OBJECT_MISMATCH/);
});

test("recovery detail checks detect types/defaults/collation, functions, triggers, sequence state and privilege drift", () => {
  // A compact catalog fixture, without a connection or personal data.
  const original = Object.fromEntries(["database","columns","indexes","functions","triggers","extensions","sequences","relations","schemas","types","views","policies","dependencies","runtime_permissions"].map(key => [key, []]));
  Object.assign(original, {
    columns: [{ type: "integer", default_expression: "0", collation: null }],
    functions: [{ definition: "fixture function", proisstrict: true }],
    triggers: [{ tgenabled: "O" }],
    sequences: [{ last_value: "2", is_called: true }],
    indexes: [{ indisvalid: true }],
    runtime_permissions: [{ can_select: true }],
  });
  assert.doesNotThrow(() => compareDetails(original, structuredClone(original)));
  for (const [category, field, value] of [
    ["columns","type","text"], ["columns","default_expression","1"], ["columns","collation","different"],
    ["functions","definition","changed function"], ["functions","proisstrict",false],
    ["triggers","tgenabled","D"], ["sequences","last_value","3"], ["sequences","is_called",false],
    ["indexes","indisvalid",false], ["runtime_permissions","can_select",false],
  ]) {
    const changed = structuredClone(original); changed[category][0][field] = value;
    assert.throws(() => compareDetails(original, changed), /RESTORE_DETAIL_/);
  }
});
