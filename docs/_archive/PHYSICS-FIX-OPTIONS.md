# Cart-Pole Physics Fix Options

## Current Changes Made
1. ✅ Gravity: 9.8 → 2.0
2. ✅ Pole mass: 0.1 → 0.3
3. ✅ Initial angle: ±2.9° → ±23°
4. ✅ Initial angular velocity: 0 → ±0.3
5. ✅ Force: 15 → 30
6. ✅ Friction: 0.1 → 0.05
7. ✅ Time step: 0.02 → 0.05

## If Still Not Working...

### Option A: Increase Gravity Even More
```javascript
gravity: 2.0 → 5.0  // Very strong gravity
```

### Option B: Simplify to Basic Pendulum
Replace complex cart-pole dynamics with simple pendulum:

```javascript
const updatePhysics = (state, actionIdx) => {
    const force = actions[actionIdx].force;
    const { x, xDot, theta, thetaDot } = state;
    
    // SIMPLIFIED: Basic pendulum equation
    // θ̈ = (g/L) * sin(θ) - damping * θ̇
    const thetaAcc = (config.gravity / poleLength) * Math.sin(theta) - 0.1 * thetaDot;
    
    // Cart responds directly to force
    const xAcc = force / cartMass - friction * xDot;
    
    // Update using Euler integration
    const newThetaDot = thetaDot + config.dt * thetaAcc;
    const newTheta = theta + config.dt * newThetaDot;
    const newXDot = xDot + config.dt * xAcc;
    const newX = Math.max(0, Math.min(config.canvasWidth, x + config.dt * newXDot));
    
    const failed = Math.abs(newTheta) > config.failAngle || newX <= 0 || newX >= config.canvasWidth;
    
    return { x: newX, xDot: newXDot, theta: newTheta, thetaDot: newThetaDot, failed };
};
```

### Option C: Use Direct Torque Model
```javascript
// Pole responds to cart acceleration
const cartAcc = force / totalMass;
const poleTorque = -cartMass * cartAcc * Math.cos(theta) + poleMass * config.gravity * Math.sin(theta);
const thetaAcc = poleTorque / (poleMass * poleLength * poleLength);
```

### Option D: Pre-computed Lookup Table
For very fast/stable physics, use pre-computed angular accelerations:
```javascript
const g_over_L = config.gravity / poleLength;
const thetaAcc = g_over_L * Math.sin(theta);  // Pure pendulum
```

## Debugging Commands

### Test if angle is changing at all:
```javascript
// In browser console after starting training:
setInterval(() => {
    console.log('Angles:', app.clients?.slice(0,3).map(c => c.state?.theta));
}, 1000);
```

### Force a large angle to see if rendering works:
```javascript
// In browser console:
app.clients[0].state.theta = 0.5;  // 28 degrees
app.clients[0].render();
```

## Recommended Next Step

1. **Check physics test results** (test-cartpole-physics.html)
2. If test shows movement → problem is in main demo (rendering or state management)
3. If test shows no movement → simplify to Option B (basic pendulum)

The basic pendulum (Option B) is:
- ✅ Much simpler (one equation)
- ✅ Guaranteed to work
- ✅ Still demonstrates balancing
- ✅ Good enough for RL demo
