import p2 from 'p2'
import { cloneDeep } from 'lodash'
/**
 * Attaches a KinematicCharacterController class on the global "p2" object.
 * Original code from: https://github.com/SebLague/2DPlatformer-Tutorial
 */

window.p2 = p2

const { vec2, Ray, RaycastResult, AABB, EventEmitter } = p2

const ZERO = vec2.create()
const UNIT_Y = vec2.fromValues(0, 1)
const DEG_TO_RAD = Math.PI / 180

// math helpers
function sign(x) {
  return x >= 0 ? 1 : -1
}
function lerp(factor, start, end) {
  return start + (end - start) * factor
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
function angle(a, b) {
  return Math.acos(vec2.dot(a, b))
}
function expandAABB(aabb, amount) {
  const halfAmount = amount * 0.5
  aabb.lowerBound[0] -= halfAmount
  aabb.lowerBound[1] -= halfAmount
  aabb.upperBound[0] += halfAmount
  aabb.upperBound[1] += halfAmount
}

class RaycastController extends EventEmitter {
  constructor(options = {}) {
    super(options)

    this.world = options.world
    this.body = options.body

    const {
      collisionMask = -1,
      skinWidth = 0.015,
      horizontalRayCount = 4,
      verticalRayCount = 4,
    } = options

    Object.assign(this, { collisionMask, skinWidth, horizontalRayCount, verticalRayCount })

    this.horizontalRaySpacing = null
    this.verticalRaySpacing = null

    this.raycastOrigins = {
      topLeft: vec2.create(),
      topRight: vec2.create(),
      bottomLeft: vec2.create(),
      bottomRight: vec2.create(),
    }

    this.updateRaycastOrigins = (() => {
      const bounds = new AABB()
      return () => {
        this.body.aabbNeedsUpdate = true
        this.calculateRaySpacing()
        bounds.copy(this.body.getAABB())

        expandAABB(bounds, this.skinWidth * -2)

        const raycastOrigins = this.raycastOrigins

        vec2.copy(raycastOrigins.bottomLeft, bounds.lowerBound)
        vec2.set(raycastOrigins.bottomRight, bounds.upperBound[0], bounds.lowerBound[1])
        vec2.set(raycastOrigins.topLeft, bounds.lowerBound[0], bounds.upperBound[1])
        vec2.copy(raycastOrigins.topRight, bounds.upperBound)
      }
    })()

    this.calculateRaySpacing = (() => {
      const bounds = new AABB()
      return () => {
        this.body.aabbNeedsUpdate = true
        bounds.copy(this.body.getAABB())
        expandAABB(bounds, this.skinWidth * -2)

        this.horizontalRayCount = clamp(this.horizontalRayCount, 2, Number.MAX_SAFE_INTEGER)
        this.verticalRayCount = clamp(this.verticalRayCount, 2, Number.MAX_SAFE_INTEGER)

        const sizeX = bounds.upperBound[0] - bounds.lowerBound[0]
        const sizeY = bounds.upperBound[1] - bounds.lowerBound[1]
        this.horizontalRaySpacing = sizeY / (this.horizontalRayCount - 1)
        this.verticalRaySpacing = sizeX / (this.verticalRayCount - 1)
      }
    })()

    this.calculateRaySpacing()
  }
}

class Controller extends RaycastController {
  constructor(options = {}) {
    super(options)

    const { maxClimbAngle = 80 * DEG_TO_RAD, maxDescendAngle = 80 * DEG_TO_RAD } = options
    Object.assign(this, { maxClimbAngle, maxDescendAngle })

    this.collisions = {
      above: false,
      below: false,
      left: false,
      right: false,
      climbingSlope: false,
      descendingSlope: false,
      slopeAngle: 0,
      slopeAngleOld: 0,
      velocityOld: vec2.create(),
      faceDir: 1,
      fallingThroughPlatform: false,
    }

    this.ray = new Ray({ mode: Ray.CLOSEST })
    this.raycastResult = new RaycastResult()

    this.emitRayCastEvent = (() => {
      const raycastEvent = { type: 'raycast' }
      return () => {
        raycastEvent.ray = this.ray
        this.emit(raycastEvent)
      }
    })()
  }

  resetCollisions(velocity) {
    const collisions = this.collisions

    collisions.above = collisions.below = false
    collisions.left = collisions.right = false
    collisions.climbingSlope = false
    collisions.descendingSlope = false
    collisions.slopeAngleOld = collisions.slopeAngle
    collisions.slopeAngle = 0
    vec2.copy(collisions.velocityOld, velocity)
  }

  moveWithZeroInput(velocity, standingOnPlatform) {
    return this.move(velocity, ZERO, standingOnPlatform)
  }

  move(velocity, input, standingOnPlatform) {
    const collisions = this.collisions

    this.updateRaycastOrigins()
    this.resetCollisions(velocity)

    if (velocity[0] !== 0) {
      collisions.faceDir = sign(velocity[0])
    }

    if (velocity[1] < 0) {
      this.descendSlope(velocity)
    }

    this.horizontalCollisions(velocity)
    if (velocity[1] !== 0) {
      this.verticalCollisions(velocity, input)
    }

    vec2.add(this.body.position, this.body.position, velocity)

    if (standingOnPlatform) {
      collisions.below = true
    }
  }

  horizontalCollisions(velocity) {
    const { collisions, maxClimbAngle, skinWidth, raycastOrigins, ray } = this
    const directionX = collisions.faceDir
    let rayLength = Math.abs(velocity[0]) + skinWidth

    // if (Math.abs(velocity[0]) < skinWidth) {
    // rayLength = 2 * skinWidth;
    // }

    for (let i = 0; i < this.horizontalRayCount; i++) {
      ray.collisionMask = this.collisionMask
      vec2.copy(
        ray.from,
        directionX === -1 ? raycastOrigins.bottomLeft : raycastOrigins.bottomRight,
      )
      ray.from[1] += this.horizontalRaySpacing * i
      vec2.set(ray.to, ray.from[0] + directionX * rayLength, ray.from[1])
      ray.update()
      this.world.raycast(this.raycastResult, ray)
      this.emitRayCastEvent()

      if (this.raycastResult.body) {
        const distance = this.raycastResult.getHitDistance(ray)
        if (distance === 0) {
          continue
        }

        const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)

        if (i === 0 && slopeAngle <= maxClimbAngle) {
          if (collisions.descendingSlope) {
            collisions.descendingSlope = false
            vec2.copy(velocity, collisions.velocityOld)
          }
          let distanceToSlopeStart = 0
          if (slopeAngle !== collisions.slopeAngleOld) {
            distanceToSlopeStart = distance - skinWidth
            velocity[0] -= distanceToSlopeStart * directionX
          }
          this.climbSlope(velocity, slopeAngle)
          velocity[0] += distanceToSlopeStart * directionX
        }

        if (!collisions.climbingSlope || slopeAngle > maxClimbAngle) {
          velocity[0] = (distance - skinWidth) * directionX
          rayLength = distance

          if (collisions.climbingSlope) {
            velocity[1] = Math.tan(collisions.slopeAngle) * Math.abs(velocity[0])
          }

          collisions.left = directionX === -1
          collisions.right = directionX === 1
        }
      }

      this.raycastResult.reset()
    }
  }

  verticalCollisions(velocity, _input) {
    const { collisions, skinWidth, raycastOrigins, ray } = this
    const directionY = sign(velocity[1])
    let rayLength = Math.abs(velocity[1]) + skinWidth

    for (let i = 0; i < this.verticalRayCount; i++) {
      ray.collisionMask = this.collisionMask
      vec2.copy(ray.from, directionY === -1 ? raycastOrigins.bottomLeft : raycastOrigins.topLeft)
      ray.from[0] += this.verticalRaySpacing * i + velocity[0]
      vec2.set(ray.to, ray.from[0], ray.from[1] + directionY * rayLength)
      ray.update()
      this.world.raycast(this.raycastResult, ray)
      this.emitRayCastEvent()

      if (this.raycastResult.body) {
        // TODO: fall through platform
        /*
				  if (hit.collider.tag === "Through") {
				  if (directionY === 1 || hit.distance === 0) {
				  continue;
				  }
				  if (collisions.fallingThroughPlatform) {
				  continue;
				  }
				  if (input[1] == -1) {
				  collisions.fallingThroughPlatform = true;
				  setTimeout(() => {
				  this.fallingThroughPlatform = false
				  }, 0.5 * 1000);
				  continue;
				  }
				  }
			  */

        const distance = this.raycastResult.getHitDistance(ray)
        velocity[1] = (distance - skinWidth) * directionY
        rayLength = distance

        if (collisions.climbingSlope) {
          velocity[0] = (velocity[1] / Math.tan(collisions.slopeAngle)) * sign(velocity[0])
        }

        collisions.below = directionY === -1
        collisions.above = directionY === 1
      }

      this.raycastResult.reset()
    }

    if (collisions.climbingSlope) {
      const directionX = sign(velocity[0])
      rayLength = Math.abs(velocity[0]) + skinWidth

      ray.collisionMask = this.collisionMask
      vec2.copy(
        ray.from,
        directionX === -1 ? raycastOrigins.bottomLeft : raycastOrigins.bottomRight,
      )
      ray.from[1] += velocity[1]
      vec2.set(ray.to, ray.from[0] + directionX * rayLength, ray.from[1])
      ray.update()
      this.world.raycast(this.raycastResult, ray)
      this.emitRayCastEvent()

      if (this.raycastResult.body) {
        const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)
        if (slopeAngle !== collisions.slopeAngle) {
          velocity[0] = (this.raycastResult.getHitDistance(ray) - skinWidth) * directionX
          collisions.slopeAngle = slopeAngle
        }
      }
    }
  }

  climbSlope(velocity, slopeAngle) {
    const collisions = this.collisions
    const moveDistance = Math.abs(velocity[0])
    const climbVelocityY = Math.sin(slopeAngle) * moveDistance

    if (velocity[1] <= climbVelocityY) {
      velocity[1] = climbVelocityY
      velocity[0] = Math.cos(slopeAngle) * moveDistance * sign(velocity[0])
      collisions.below = true
      collisions.climbingSlope = true
      collisions.slopeAngle = slopeAngle
    }
  }

  descendSlope(velocity) {
    const { raycastOrigins, collisions, ray } = this
    const directionX = sign(velocity[0])

    ray.collisionMask = this.collisionMask
    vec2.copy(ray.from, directionX === -1 ? raycastOrigins.bottomRight : raycastOrigins.bottomLeft)
    vec2.set(ray.to, ray.from[0], ray.from[1] - 1e6)
    ray.update()
    this.world.raycast(this.raycastResult, ray)
    this.emitRayCastEvent()

    if (this.raycastResult.body) {
      const slopeAngle = angle(this.raycastResult.normal, UNIT_Y)
      if (slopeAngle !== 0 && slopeAngle <= this.maxDescendAngle) {
        if (sign(this.raycastResult.normal[0]) === directionX) {
          if (
            this.raycastResult.getHitDistance(ray) - this.skinWidth <=
            Math.tan(slopeAngle) * Math.abs(velocity[0])
          ) {
            const moveDistance = Math.abs(velocity[0])
            const descendVelocityY = Math.sin(slopeAngle) * moveDistance
            velocity[0] = Math.cos(slopeAngle) * moveDistance * sign(velocity[0])
            velocity[1] -= descendVelocityY

            collisions.slopeAngle = slopeAngle
            collisions.descendingSlope = true
            collisions.below = true
          }
        }
      }
    }

    this.raycastResult.reset()
  }
}

export default class KinematicCharacterController extends Controller {
  constructor(options = {}) {
    super(options)

    this.input = vec2.create()
    const {
      accelerationTimeAirborne = 0.2,
      accelerationTimeGrounded = 0.1,
      moveSpeed = 6,
      wallSlideSpeedMax = 3,
      wallStickTime = 0.25,
      wallJumpClimb = [10, 10],
      wallJumpOff = [10, 10],
      wallLeap = [10, 10],
      timeToJumpApex = 0.4,
      maxJumpHeight = 4,
      minJumpHeight = 1,
      velocityXSmoothing = 0.2,
      velocityXMin = 0.0001,
    } = cloneDeep(options)

    Object.assign(this, {
      accelerationTimeAirborne,
      accelerationTimeGrounded,
      moveSpeed,
      wallSlideSpeedMax,
      wallStickTime,
      wallJumpClimb,
      wallJumpOff,
      wallLeap,
      timeToJumpApex,
      maxJumpHeight,
      minJumpHeight,
      velocityXSmoothing,
      velocityXMin,
    })

    this._gravity = this.gravity = -(2 * maxJumpHeight) / Math.pow(timeToJumpApex, 2)
    this.maxJumpVelocity = Math.abs(this.gravity) * timeToJumpApex
    this.minJumpVelocity = Math.sqrt(2 * Math.abs(this.gravity) * minJumpHeight)
    this.terminalVelocity = -this.maxJumpVelocity

    this.velocity = vec2.create()
    this.scaledVelocity = vec2.create()

    this.timeToWallUnstick = 0
    this._requestJump = false
    this._requestUnJump = false
  }

  setJumpKeyState(isDown) {
    if (isDown) {
      this._requestJump = true
    } else {
      this._requestUnJump = true
    }
  }

  update(deltaTime) {
    const { collisions, velocity, input } = this
    if (this.terminalVelocity && velocity[1] < this.terminalVelocity) {
      // deltaTime was spent falling faster than terminalVelocity
      this.body.position[1] += deltaTime * this.terminalVelocity - deltaTime * velocity[1]
      velocity[1] = this.terminalVelocity
      this.gravity = 0
    }
    this._lastY = this.body.position[1]

    if (velocity[1] > this.terminalVelocity) {
      this.gravity = this._gravity
    }

    const wallDirX = collisions.left ? -1 : 1
    const targetVelocityX = input[0] * this.moveSpeed

    let smoothing = this.velocityXSmoothing
    smoothing *= collisions.below ? this.accelerationTimeGrounded : this.accelerationTimeAirborne
    const factor = 1 - Math.pow(smoothing, deltaTime)
    velocity[0] = lerp(factor, velocity[0], targetVelocityX)
    if (Math.abs(velocity[0]) < this.velocityXMin) {
      velocity[0] = 0
    }

    const wallSliding =
      (collisions.left || collisions.right) && !collisions.below && velocity[1] < 0
    if (wallSliding) {
      if (velocity[1] < -this.wallSlideSpeedMax) {
        velocity[1] = -this.wallSlideSpeedMax
      }

      if (this.timeToWallUnstick > 0) {
        velocity[0] = 0

        if (input[0] !== wallDirX && input[0] !== 0) {
          this.timeToWallUnstick -= deltaTime
        } else {
          this.timeToWallUnstick = this.wallStickTime
        }
      } else {
        this.timeToWallUnstick = this.wallStickTime
      }
    }

    if (this._requestJump) {
      this._requestJump = false

      if (wallSliding) {
        if (wallDirX === input[0]) {
          velocity[0] = -wallDirX * this.wallJumpClimb[0]
          velocity[1] = this.wallJumpClimb[1]
        } else if (input[0] === 0) {
          velocity[0] = -wallDirX * this.wallJumpOff[0]
          velocity[1] = this.wallJumpOff[1]
        } else {
          velocity[0] = -wallDirX * this.wallLeap[0]
          velocity[1] = this.wallLeap[1]
        }
      } else if (collisions.below) {
        // can only jump if standing on something
        velocity[1] = this.maxJumpVelocity
      }
    }

    if (this._requestUnJump) {
      this._requestUnJump = false
      if (velocity[1] > this.minJumpVelocity) {
        velocity[1] = this.minJumpVelocity
      }
    }

    velocity[1] += this.gravity * deltaTime
    vec2.scale(this.scaledVelocity, velocity, deltaTime)
    this.move(this.scaledVelocity, input)

    if (collisions.above || collisions.below) {
      velocity[1] = 0
    }
  }
}
