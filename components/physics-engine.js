/**
 * PHYSICS-ENGINE.JS - Matter.js Integration for Federated RL
 * 
 * Wraps Matter.js physics engine for easy RL environment creation.
 * Provides clean API for creating physics-based RL tasks.
 * 
 * @module physics-engine
 * @version 1.0.0
 * @requires matter-js (CDN or npm)
 */

// Matter.js will be loaded via CDN in HTML
// Available as global: Matter

// ============================================================================
// PHYSICS WORLD MANAGER
// ============================================================================

/**
 * Create a physics world with Matter.js
 * 
 * @param {Object} config - World configuration
 * @param {number} config.width - World width
 * @param {number} config.height - World height
 * @param {number} config.gravity - Gravity strength (default: 1)
 * @param {boolean} config.enableSleeping - Enable body sleeping (default: false)
 * @returns {Object} Physics world interface
 */
export const createPhysicsWorld = (config = {}) => {
    const {
        width = 800,
        height = 600,
        gravity = 1,
        enableSleeping = false
    } = config;

    // Check if Matter.js is loaded
    if (typeof Matter === 'undefined') {
        throw new Error('Matter.js not loaded! Include: <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>');
    }

    // Create engine
    const engine = Matter.Engine.create({
        enableSleeping
    });

    // Set gravity
    engine.gravity.y = gravity;

    // Create world bounds
    const bounds = {
        min: { x: 0, y: 0 },
        max: { x: width, y: height }
    };

    return {
        engine,
        world: engine.world,
        bounds,

        /**
         * Step physics simulation
         * @param {number} delta - Time step in ms (default: 16.67ms = 60fps)
         */
        step: (delta = 1000 / 60) => {
            Matter.Engine.update(engine, delta);
        },

        /**
         * Add body to world
         * @param {Matter.Body} body - Body to add
         */
        addBody: (body) => {
            Matter.World.add(engine.world, body);
        },

        /**
         * Remove body from world
         * @param {Matter.Body} body - Body to remove
         */
        removeBody: (body) => {
            Matter.World.remove(engine.world, body);
        },

        /**
         * Clear all bodies
         */
        clear: () => {
            Matter.World.clear(engine.world, false);
        },

        /**
         * Get all bodies
         * @returns {Matter.Body[]} Array of bodies
         */
        getBodies: () => {
            return Matter.Composite.allBodies(engine.world);
        },

        /**
         * Set gravity
         * @param {number} x - Gravity X
         * @param {number} y - Gravity Y
         */
        setGravity: (x, y) => {
            engine.gravity.x = x;
            engine.gravity.y = y;
        }
    };
};

// ============================================================================
// BODY CREATION HELPERS
// ============================================================================

/**
 * Create a ball (circle body)
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Ball radius
 * @param {Object} options - Matter.js body options
 * @returns {Matter.Body} Ball body
 */
export const createBall = (x, y, radius, options = {}) => {
    return Matter.Bodies.circle(x, y, radius, {
        restitution: 0.6,  // Bounciness
        friction: 0.01,
        frictionAir: 0.01,
        ...options
    });
};

/**
 * Create a platform (rectangle body)
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Platform width
 * @param {number} height - Platform height
 * @param {Object} options - Matter.js body options
 * @returns {Matter.Body} Platform body
 */
export const createPlatform = (x, y, width, height, options = {}) => {
    return Matter.Bodies.rectangle(x, y, width, height, {
        isStatic: false,
        friction: 0.3,
        ...options
    });
};

/**
 * Create a static wall/ground
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Wall width
 * @param {number} height - Wall height
 * @param {Object} options - Matter.js body options
 * @returns {Matter.Body} Wall body
 */
export const createWall = (x, y, width, height, options = {}) => {
    return Matter.Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        friction: 0.5,
        ...options
    });
};

/**
 * Create a cart (rectangle with wheels)
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Cart width
 * @param {number} height - Cart height
 * @param {Object} options - Matter.js body options
 * @returns {Matter.Body} Cart body
 */
export const createCart = (x, y, width, height, options = {}) => {
    return Matter.Bodies.rectangle(x, y, width, height, {
        friction: 0.05,
        frictionAir: 0.01,
        ...options
    });
};

/**
 * Create a pole (thin rectangle)
 * 
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} length - Pole length
 * @param {number} width - Pole width (thickness)
 * @param {Object} options - Matter.js body options
 * @returns {Matter.Body} Pole body
 */
export const createPole = (x, y, length, width, options = {}) => {
    return Matter.Bodies.rectangle(x, y, width, length, {
        friction: 0.01,
        frictionAir: 0.001,
        ...options
    });
};

// ============================================================================
// CONSTRAINTS (JOINTS, HINGES)
// ============================================================================

/**
 * Create a hinge constraint (revolute joint)
 * 
 * @param {Matter.Body} bodyA - First body
 * @param {Matter.Body} bodyB - Second body
 * @param {Object} pointA - Point on bodyA
 * @param {Object} pointB - Point on bodyB
 * @param {Object} options - Constraint options
 * @returns {Matter.Constraint} Hinge constraint
 */
export const createHinge = (bodyA, bodyB, pointA = { x: 0, y: 0 }, pointB = { x: 0, y: 0 }, options = {}) => {
    return Matter.Constraint.create({
        bodyA,
        bodyB,
        pointA,
        pointB,
        length: 0,
        stiffness: 1,
        ...options
    });
};

/**
 * Create a spring constraint
 * 
 * @param {Matter.Body} bodyA - First body
 * @param {Matter.Body} bodyB - Second body
 * @param {number} length - Rest length
 * @param {number} stiffness - Spring stiffness (0-1)
 * @param {Object} options - Constraint options
 * @returns {Matter.Constraint} Spring constraint
 */
export const createSpring = (bodyA, bodyB, length, stiffness = 0.5, options = {}) => {
    return Matter.Constraint.create({
        bodyA,
        bodyB,
        length,
        stiffness,
        ...options
    });
};

// ============================================================================
// PHYSICS STATE EXTRACTION
// ============================================================================

/**
 * Get body state for RL
 * 
 * @param {Matter.Body} body - Body to extract state from
 * @returns {Object} State object with position, velocity, angle, etc.
 */
export const getBodyState = (body) => {
    return {
        x: body.position.x,
        y: body.position.y,
        vx: body.velocity.x,
        vy: body.velocity.y,
        angle: body.angle,
        angularVelocity: body.angularVelocity,
        isStatic: body.isStatic,
        isSleeping: body.isSleeping
    };
};

/**
 * Extract state from multiple bodies
 * 
 * @param {Object} bodies - Named bodies object
 * @returns {Object} Combined state
 */
export const getSystemState = (bodies) => {
    const state = {};
    for (const [name, body] of Object.entries(bodies)) {
        state[name] = getBodyState(body);
    }
    return state;
};

// ============================================================================
// FORCE APPLICATION
// ============================================================================

/**
 * Apply force to body
 * 
 * @param {Matter.Body} body - Body to apply force to
 * @param {number} fx - Force X
 * @param {number} fy - Force Y
 * @param {Object} point - Point to apply force (default: center)
 */
export const applyForce = (body, fx, fy, point = null) => {
    const forcePoint = point || body.position;
    Matter.Body.applyForce(body, forcePoint, { x: fx, y: fy });
};

/**
 * Set body velocity
 * 
 * @param {Matter.Body} body - Body
 * @param {number} vx - Velocity X
 * @param {number} vy - Velocity Y
 */
export const setVelocity = (body, vx, vy) => {
    Matter.Body.setVelocity(body, { x: vx, y: vy });
};

/**
 * Set body position
 * 
 * @param {Matter.Body} body - Body
 * @param {number} x - Position X
 * @param {number} y - Position Y
 */
export const setPosition = (body, x, y) => {
    Matter.Body.setPosition(body, { x, y });
};

/**
 * Set body angle
 * 
 * @param {Matter.Body} body - Body
 * @param {number} angle - Angle in radians
 */
export const setAngle = (body, angle) => {
    Matter.Body.setAngle(body, angle);
};

// ============================================================================
// RENDERING HELPERS
// ============================================================================

/**
 * Render body to canvas
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Matter.Body} body - Body to render
 * @param {string} fillStyle - Fill color
 * @param {string} strokeStyle - Stroke color
 */
export const renderBody = (ctx, body, fillStyle = '#667eea', strokeStyle = '#333') => {
    const vertices = body.vertices;
    
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
};

/**
 * Render constraint to canvas
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Matter.Constraint} constraint - Constraint to render
 * @param {string} strokeStyle - Line color
 */
export const renderConstraint = (ctx, constraint, strokeStyle = '#999') => {
    const bodyA = constraint.bodyA;
    const bodyB = constraint.bodyB;
    
    if (!bodyA || !bodyB) return;
    
    const pointA = bodyA.position;
    const pointB = bodyB.position;
    
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.stroke();
    ctx.restore();
};

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Check if two bodies are colliding
 * 
 * @param {Matter.Body} bodyA - First body
 * @param {Matter.Body} bodyB - Second body
 * @returns {boolean} True if colliding
 */
export const areColliding = (bodyA, bodyB) => {
    const collision = Matter.SAT.collides(bodyA, bodyB);
    return collision.collided;
};

/**
 * Get all collisions for a body
 * 
 * @param {Matter.Body} body - Body to check
 * @param {Matter.Body[]} bodies - All bodies in world
 * @returns {Matter.Body[]} Array of colliding bodies
 */
export const getCollisions = (body, bodies) => {
    return bodies.filter(other => 
        other !== body && areColliding(body, other)
    );
};

// Export default object
export default {
    createPhysicsWorld,
    createBall,
    createPlatform,
    createWall,
    createCart,
    createPole,
    createHinge,
    createSpring,
    getBodyState,
    getSystemState,
    applyForce,
    setVelocity,
    setPosition,
    setAngle,
    renderBody,
    renderConstraint,
    areColliding,
    getCollisions
};

