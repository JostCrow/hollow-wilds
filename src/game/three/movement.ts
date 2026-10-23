export const TURN_SPEED = 2.2;

/** Heading is the explorer's forward direction, independent of the camera. */
export function steer(heading: number, turn: number, forward: number, speed: number, dt: number) {
  const angle = -turn * TURN_SPEED * Math.max(0, dt);
  const nextHeading = heading + angle;
  const travel = forward * speed * Math.max(0, dt);
  // Integrate the arc so steering takes the same path at different frame rates.
  const scale = Math.abs(angle) < 1e-8 ? travel : travel * 2 * Math.sin(angle / 2) / angle;
  const middle = heading + angle / 2;
  return {
    heading: Math.atan2(Math.sin(nextHeading), Math.cos(nextHeading)),
    dx: Math.sin(middle) * scale,
    dz: Math.cos(middle) * scale,
  };
}
