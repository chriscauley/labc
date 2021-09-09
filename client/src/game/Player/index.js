// Taken from p2.js/examples/canvas/js/KinematicCharacterController.js

import p2 from 'p2'
import { cloneDeep } from 'lodash'
import Controller from './Controller'
import { PLAYER_GROUP, SCENERY_GROUP, BULLET_GROUP } from '../constants'
import BombController from '../inventory/BombController'

window.p2 = p2

const { vec2 } = p2

// math helpers
function lerp(factor, start, end) {
  return start + (end - start) * factor
}

export default class Player extends Controller {
  constructor(options = {}) {
    const { start = [0, 0] } = options
    Object.assign(options, {
      collisionMask: SCENERY_GROUP,
      velocityXSmoothing: 0.0001,
      skinWidth: 0.1,
    })
    options.body = new p2.Body({
      mass: 0,
      position: start,
      fixedRotation: true,
      damping: 0,
      type: p2.Body.KINEMATIC,
    })
    options.body.addShape(
      new p2.Box({
        width: 8 / 16,
        height: 14 / 16, // TODO switch between ball and standing (=40/16)
        collisionGroup: PLAYER_GROUP,
      }),
    )
    options.world.addBody(options.body)

    super(options)
    this.game = options.game

    this.input = vec2.create()
    this.inventory = {
      bomb: new BombController({ player: this, game: this.game }),
    }
    this.loadout = {
      shoot1: this.inventory.bomb,
    }
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
      tech = { bomb_linked: true, bomb_triggered: true },
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
      tech,
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

    this.keys = {
      left: 0,
      right: 0,
      up: 0,
      down: 0,
      shoot: 0,
      shoot2: 0,
      jump: 0,
      run: 0,
      aim_up: 0,
      aim_down: 0,
    }
  }

  press(key) {
    this.keys[key] = 1
    if (key === 'jump') {
      this._requestJump = true
    } else if (key === 'shoot1') {
      this.loadout.shoot1?.press()
    }
  }

  release(key) {
    this.keys[key] = 0
    if (key === 'jump') {
      this._requestUnJump = true
    } else if (key === 'shoot1') {
      this.loadout.shoot1?.release()
    }
  }

  shoot() {
    const position = vec2.copy([0, 0], this.body.position)
    if (false) {
      // shoot bullet
      const velocity = [5, 0]
      const bulletBody = new p2.Body({ mass: 0.05, position, velocity, gravityScale: 0 })
      const bulletShape = new p2.Circle({ radius: 0.2 })
      bulletBody.addShape(bulletShape)
      bulletShape.collisionGroup = BULLET_GROUP
      bulletShape.collisionMask = SCENERY_GROUP
      this.world.addBody(bulletBody)
    } else {
      // shoot bomb
    }
  }

  update(deltaTime) {
    const { collisions, velocity, keys } = this
    const input = [(keys.right ? 1 : 0) - (keys.left ? 1 : 0), 0]
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
