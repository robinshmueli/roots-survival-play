import { PLAYER, WORLD } from './config.js';

export function createMovement(world) {
  const velocity = { x: 0, y: 0 };
  const limit = WORLD.size / 2 - 1;
  const clamp = value => Math.max(-limit, Math.min(limit, value));

  return {
    stop() {
      velocity.x = 0;
      velocity.y = 0;
    },
    step(position, input, dt, speedMultiplier = 1) {
      world.resolvePlayerPosition?.(position);
      const inputLength = Math.hypot(input.x, input.y);
      const targetX = inputLength ? input.x / inputLength * PLAYER.speed * speedMultiplier : 0;
      const targetY = inputLength ? input.y / inputLength * PLAYER.speed * speedMultiplier : 0;
      const differenceX = targetX - velocity.x;
      const differenceY = targetY - velocity.y;
      const difference = Math.hypot(differenceX, differenceY);
      const reversing = velocity.x * targetX + velocity.y * targetY < 0;
      const rate = !inputLength || reversing
        ? PLAYER.braking * Math.max(1, Math.hypot(velocity.x, velocity.y) / PLAYER.speed)
        : PLAYER.acceleration * Math.max(1, speedMultiplier * .85);
      const amount = difference ? Math.min(1, rate * dt / difference) : 0;
      const oldVelocityX = velocity.x, oldVelocityY = velocity.y;
      velocity.x += differenceX * amount;
      velocity.y += differenceY * amount;

      const oldX = position.x, oldY = position.y;
      // Integrating both velocities softens starts and stops without diagonal speed boosts.
      const nextX = clamp(position.x + (oldVelocityX + velocity.x) * .5 * dt);
      if (!world.blocked(nextX, position.y, PLAYER.radius, true)) position.x = nextX;
      else velocity.x = 0;
      const nextY = clamp(position.y + (oldVelocityY + velocity.y) * .5 * dt);
      if (!world.blocked(position.x, nextY, PLAYER.radius, true)) position.y = nextY;
      else velocity.y = 0;

      const dx = position.x - oldX, dy = position.y - oldY;
      const distance = Math.hypot(dx, dy);
      return {
        distance,
        direction: distance > .00001 ? { x: dx / distance, y: dy / distance } : input,
      };
    },
  };
}
