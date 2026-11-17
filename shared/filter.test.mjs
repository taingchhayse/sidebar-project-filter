import assert from "node:assert/strict";
import test from "node:test";
import { hasProjectQuery, matchesProject } from "./filter.ts";

test("an empty or punctuation-only query shows every project", () => {
  assert.equal(matchesProject("   ", ["Payments", "/repos/payments"]), true);
  assert.equal(matchesProject("--- / _", ["Payments", "/repos/payments"]), true);
  assert.equal(hasProjectQuery("--- / _"), false);
  assert.equal(hasProjectQuery("pay"), true);
});

test("fuzzy matches names and paths without case sensitivity", () => {
  assert.equal(matchesProject("PAY", ["Payments", "/repos/payments"]), true);
  assert.equal(matchesProject("repos/pay", ["Payments", "/Repos/Payments"]), true);
  assert.equal(matchesProject("live pay", ["live3_svr_pay"]), true);
  assert.equal(matchesProject("lvpay", ["live3_svr_pay"]), true);
  assert.equal(matchesProject("website", ["Payments", "/repos/payments"]), false);
});
