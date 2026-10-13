export type WalkingLegPose = {
  hipAngle: number;
  kneeAngle: number;
  lengthScale: number;
};

/** Phase is advanced by distance travelled, so a planted player cannot march in place. */
export function walkingLegPose(phase: number, leg: 0 | 1, direction: string): WalkingLegPose {
  const cycle = phase + leg * Math.PI;
  const swing = Math.sin(cycle), lift = Math.max(0, swing);
  const profile = direction === "left" || direction === "right";
  const facing = direction === "left" ? 1 : -1;
  return {
    hipAngle: swing * (profile ? .34 : .09) * (profile ? facing : leg === 0 ? 1 : -1),
    kneeAngle: profile ? -facing * lift * .65 : (leg === 0 ? -.16 : .16) * lift,
    // Foreshortening makes the raised shoe visibly leave the ground in front/back views.
    lengthScale: 1 - lift * (profile ? .06 : .24),
  };
}
