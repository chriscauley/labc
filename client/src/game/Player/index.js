// Taken from p2.js/examples/canvas/js/KinematicCharacterController.js

import p2 from 'p2'
import { cloneDeep } from 'lodash'
import Controller from './Controller'

window.p2 = p2

const { vec2 } = p2

// math helpers
function lerp(factor, start, end) {
  return start + (end - start) * factor
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
      wallJumpClimb = [20, 20], // holding towards wall
      wallLeap = [20, 20], // holding away from wall
      wallJumpOff = [20, 20], // holding neither
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