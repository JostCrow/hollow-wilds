import { test } from "node:test";
import assert from "node:assert/strict";
import { walkingLegPose } from "./player-walk.ts";

test("walking alternates a raised foot and a planted foot in every direction", () => {
  for (const direction of ["up", "down", "left", "right"]) {
    const first = walkingLegPose(Math.PI / 2, 0, direction);
    const second = walkingLegPose(Math.PI / 2, 1, direction);
    assert.ok(first.lengthScale < .95);
    assert.equal(second.lengthScale, 1);
    assert.ok(Math.abs(first.kneeAngle) > .1);
    assert.equal(Math.abs(second.kneeAngle), 0);
    const exchanged = walkingLegPose(Math.PI * 1.5, 1, direction);
    assert.ok(Math.abs(first.lengthScale - exchanged.lengthScale) < 1e-12);
  }
});

test("profile gait mirrors the knee hinge when the player changes facing", () => {
  const left = walkingLegPose(Math.PI / 2, 0, "left");
  const right = walkingLegPose(Math.PI / 2, 0, "right");
  assert.equal(left.hipAngle, -right.hipAngle);
  assert.equal(left.kneeAngle, -right.kneeAngle);
  assert.equal(left.lengthScale, right.lengthScale);
});
