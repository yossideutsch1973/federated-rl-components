# 🎮 Physics Engine Integration Guide

## Overview

The `physics-engine.js` component wraps **Matter.js** (industry-standard 2D physics engine) for easy integration with federated RL demos.

**Benefits:**
- ✅ Real rigid body physics
- ✅ Accurate collision detection
- ✅ Constraints (hinges, springs)
- ✅ Stable, tested, production-ready
- ✅ No manual physics coding required

---

## Quick Start

### 1. Include Matter.js

Add to your HTML:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
```

### 2. Import Component

```javascript
import * as Physics from '../components/physics-engine.js';
```

### 3. Create Physics World

```javascript
const world = Physics.createPhysicsWorld({
    width: 800,
    height: 600,
    gravity: 1.0
});
```

### 4. Add Bodies

```javascript
// Ball
const ball = Physics.createBall(400, 100, 20);
world.addBody(ball);

// Platform
const platform = Physics.createPlatform(400, 500, 100, 20);
world.addBody(platform);

// Ground (static)
const ground = Physics.createWall(400, 580, 800, 40);
world.addBody(ground);
```

### 5. Step Simulation

```javascript
// In your step function
world.step(16); // 16ms = 60fps
```

### 6. Get State for RL

```javascript
const ballState = Physics.getBodyState(ball);
// { x, y, vx, vy, angle, angularVelocity, ... }
```

---

## API Reference

### World Management

#### `createPhysicsWorld(config)`

Creates a physics world.

**Parameters:**
- `width` - World width (default: 800)
- `height` - World height (default: 600)
- `gravity` - Gravity strength (default: 1)
- `enableSleeping` - Enable body sleeping for performance (default: false)

**Returns:** World interface with methods:
- `step(delta)` - Step simulation
- `addBody(body)` - Add body to world
- `removeBody(body)` - Remove body
- `clear()` - Remove all bodies
- `getBodies()` - Get all bodies
- `setGravity(x, y)` - Change gravity

**Example:**
```javascript
const world = Physics.createPhysicsWorld({
    width: 800,
    height: 600,
    gravity: 1.5 // 50% stronger gravity
});
```

---

### Body Creation

#### `createBall(x, y, radius, options)`

Creates a circular body (ball).

**Parameters:**
- `x, y` - Position
- `radius` - Ball radius
- `options` - Matter.js body options (restitution, friction, etc.)

**Example:**
```javascript
const ball = Physics.createBall(400, 100, 20, {
    restitution: 0.8,  // Very bouncy
    friction: 0.1
});
```

#### `createPlatform(x, y, width, height, options)`

Creates a rectangular platform.

**Example:**
```javascript
const platform = Physics.createPlatform(400, 500, 100, 20, {
    isStatic: false, // Can move
    friction: 0.5
});
```

#### `createWall(x, y, width, height, options)`

Creates a static wall/ground.

**Example:**
```javascript
const ground = Physics.createWall(400, 580, 800, 40, {
    isStatic: true,
    friction: 0.8
});
```

#### `createCart(x, y, width, height, options)`

Creates a cart body (for cart-pole).

#### `createPole(x, y, length, width, options)`

Creates a thin pole body.

---

### Constraints (Joints)

#### `createHinge(bodyA, bodyB, pointA, pointB, options)`

Creates a revolute joint (hinge) between two bodies.

**Example:**
```javascript
// Connect pole to cart
const hinge = Physics.createHinge(
    cart,
    pole,
    { x: 0, y: -10 }, // Top of cart
    { x: 0, y: 30 },  // Bottom of pole
    { stiffness: 1, damping: 0.01 }
);
world.addBody(hinge);
```

#### `createSpring(bodyA, bodyB, length, stiffness, options)`

Creates a spring constraint.

**Example:**
```javascript
const spring = Physics.createSpring(wallBody, platform, 100, 0.1);
world.addBody(spring);
```

---

### State Extraction

#### `getBodyState(body)`

Extracts state from a body for RL.

**Returns:**
```javascript
{
    x: number,
    y: number,
    vx: number,
    vy: number,
    angle: number,
    angularVelocity: number,
    isStatic: boolean,
    isSleeping: boolean
}
```

**Example:**
```javascript
const state = Physics.getBodyState(ball);
console.log(`Ball at (${state.x}, ${state.y}) with velocity (${state.vx}, ${state.vy})`);
```

#### `getSystemState(bodies)`

Extracts state from multiple bodies.

**Example:**
```javascript
const state = Physics.getSystemState({
    ball: ballBody,
    platform: platformBody,
    cart: cartBody
});
// state.ball.x, state.platform.y, etc.
```

---

### Force Application

#### `applyForce(body, fx, fy, point?)`

Applies force to a body.

**Example:**
```javascript
// Push platform left
Physics.applyForce(platform, -0.01, 0);

// Push cart right
Physics.applyForce(cart, 0.005, 0);
```

#### `setVelocity(body, vx, vy)`

Directly sets velocity.

**Example:**
```javascript
// Stop the ball
Physics.setVelocity(ball, 0, 0);
```

#### `setPosition(body, x, y)`

Teleport body to position.

**Example:**
```javascript
Physics.setPosition(ball, 400, 100);
```

#### `setAngle(body, angle)`

Set body rotation.

**Example:**
```javascript
// Start pole at 30 degrees
Physics.setAngle(pole, Math.PI / 6);
```

---

### Rendering

#### `renderBody(ctx, body, fillStyle, strokeStyle)`

Renders a body to canvas.

**Example:**
```javascript
Physics.renderBody(ctx, ball, '#ff6b6b', '#dc2626');
Physics.renderBody(ctx, platform, '#667eea', '#5568d3');
```

#### `renderConstraint(ctx, constraint, strokeStyle)`

Renders a constraint (joint/spring) as a line.

**Example:**
```javascript
Physics.renderConstraint(ctx, hinge, '#999');
```

---

### Collision Detection

#### `areColliding(bodyA, bodyB)`

Check if two bodies are colliding.

**Example:**
```javascript
if (Physics.areColliding(ball, platform)) {
    console.log('Ball hit platform!');
}
```

#### `getCollisions(body, bodies)`

Get all bodies colliding with a body.

**Example:**
```javascript
const collisions = Physics.getCollisions(ball, world.getBodies());
collisions.forEach(other => {
    console.log('Collision detected!');
});
```

---

## Complete Example

```javascript
import { createFederatedApp } from '../components/app-template.js';
import * as Physics from '../components/physics-engine.js';

createFederatedApp({
    name: 'Physics Demo',
    numClients: 4,
    
    environment: {
        actions: ['LEFT', 'STAY', 'RIGHT'],
        
        getState: (s) => {
            const ball = Physics.getBodyState(s.ball);
            const platform = Physics.getBodyState(s.platform);
            return `${Math.floor(ball.x/10)},${Math.floor(ball.y/10)},${Math.floor(platform.x/10)}`;
        },
        
        step: (s, action) => {
            // Apply action
            const forces = { 0: -0.01, 1: 0, 2: 0.01 };
            Physics.applyForce(s.platform, forces[action], 0);
            
            // Step physics
            s.world.step(16);
            
            // Get state
            const ball = Physics.getBodyState(s.ball);
            const platform = Physics.getBodyState(s.platform);
            
            // Calculate reward
            const dist = Math.abs(ball.x - platform.x);
            const reward = ball.y > 300 ? -100 : Math.max(0, 10 - dist/5);
            const done = ball.y > 300;
            
            return { state: s, reward, done };
        },
        
        reset: (clientId) => {
            // Create world
            const world = Physics.createPhysicsWorld({
                width: 300,
                height: 300,
                gravity: 1.0
            });
            
            // Create bodies
            const ball = Physics.createBall(150, 50, 10);
            const platform = Physics.createPlatform(150, 200, 60, 10, { isStatic: false });
            const ground = Physics.createWall(150, 290, 300, 20);
            
            world.addBody(ball);
            world.addBody(platform);
            world.addBody(ground);
            
            return { world, ball, platform, ground };
        }
    },
    
    render: (ctx, s) => {
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(0, 0, 300, 300);
        
        Physics.renderBody(ctx, s.ground, '#cbd5e0');
        Physics.renderBody(ctx, s.platform, '#667eea');
        Physics.renderBody(ctx, s.ball, '#ff6b6b');
    }
});
```

---

## Advanced: Custom Body Properties

### Restitution (Bounciness)

```javascript
const bouncyBall = Physics.createBall(400, 100, 20, {
    restitution: 0.9 // Very bouncy (0 = no bounce, 1 = perfect bounce)
});
```

### Friction

```javascript
const slipperyPlatform = Physics.createPlatform(400, 500, 100, 20, {
    friction: 0.01 // Very slippery
});

const stickyPlatform = Physics.createPlatform(400, 500, 100, 20, {
    friction: 1.0 // Very sticky
});
```

### Density (Mass)

```javascript
const heavyBall = Physics.createBall(400, 100, 20, {
    density: 0.1 // Heavy
});

const lightBall = Physics.createBall(400, 100, 20, {
    density: 0.001 // Light
});
```

### Air Resistance

```javascript
const airResistant = Physics.createBall(400, 100, 20, {
    frictionAir: 0.1 // High air resistance
});
```

---

## Heterogeneous Physics

Create diversity across clients by varying physics properties:

```javascript
reset: (clientId) => {
    // Different gravity per client
    const world = Physics.createPhysicsWorld({
        gravity: 0.8 + clientId * 0.1 // Clients 0-7: 0.8 to 1.5
    });
    
    // Different ball properties
    const ball = Physics.createBall(150, 50, 10, {
        restitution: 0.5 + clientId * 0.05, // Different bounciness
        friction: 0.05 + clientId * 0.01    // Different friction
    });
    
    // ...
}
```

---

## Performance Tips

1. **Disable sleeping for RL** (bodies stop simulating when still)
   ```javascript
   createPhysicsWorld({ enableSleeping: false })
   ```

2. **Use static bodies for walls/ground**
   ```javascript
   createWall(x, y, w, h, { isStatic: true })
   ```

3. **Limit time step** (for stability)
   ```javascript
   world.step(16); // 60fps, don't go below 10ms
   ```

4. **Remove unused bodies**
   ```javascript
   world.removeBody(oldBody);
   ```

---

## Troubleshooting

### Bodies falling through ground

→ Ground might be too thin or time step too large
```javascript
const ground = Physics.createWall(x, y, width, 40); // Thicker
world.step(16); // Smaller time step
```

### Bodies moving too fast

→ Apply smaller forces
```javascript
Physics.applyForce(body, 0.001, 0); // Smaller force
```

### Pendulum too slow/fast

→ Adjust gravity or damping
```javascript
createPhysicsWorld({ gravity: 2.0 }); // Stronger
createHinge(a, b, pA, pB, { damping: 0.05 }); // More damping
```

---

## Examples

**See:**
- `examples/ball-balancing-physics.html` - Ball balancing with physics
- `examples/cart-pole-physics.html` - Cart-pole with hinge constraint

---

## Resources

- **Matter.js Docs:** https://brm.io/matter-js/docs/
- **Matter.js Examples:** https://brm.io/matter-js/demo/
- **Physics Tutorial:** https://brm.io/matter-js/

---

**Version:** 1.0  
**Date:** October 2025

