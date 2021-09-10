import { vec2, Body, Circle } from 'p2'
import { BULLET_GROUP, SCENERY_GROUP, POSTURE } from '../constants'

class Beam {
  constructor({ player, position, velocity }) {
    this.player = player
    this.makeShape(position, velocity)
  }
  makeShape(position, velocity) {
    this.body = new Body({
      mass: 0.05,
      position,
      velocity,
      gravityScale: 0,
      damping: 0,
      collisionResponse: false,
    })
    const shape = new Circle({ radius: 0.2 })
    shape.collisionGroup = BULLET_GROUP
    shape.collisionMask = SCENERY_GROUP
    this.body.addShape(shape)
    this.player.game.bindEntity(this)
  }
  impact(result) {
    this.player.world.emit({
      type: 'damage',
      damage: {
        type: 'beam',
        player: this.player.id,
        amount: 1,
        body_id: result.bodyB.id,
      },
    })
    this.player.game.removeEntity(this)
  }
}

export default class BeamController {
  constructor({ player }) {
    this.player = player
    this.BULLET_SPEED = 25 // TODO 25 is totally arbitrary based of terminal velocity ~20
  }
  shoot() {
    const [position, dxy] = this.getPositionAndDxy()
    const velocity = [dxy[0] * this.BULLET_SPEED, dxy[1] * this.BULLET_SPEED]
    new Beam({ player: this.player, position, velocity })
  }
  press() {
    this.shoot()
  }
  release() {}
  getPositionAndDxy() {
    const { body } = this.player
    const position = vec2.copy([0, 0], body.position) // start at player center
    position[1] = body.aabb.lowerBound[1] // bottom edge, center
    const half_width = body.shapes[0].width / 2
    const dx = this.player.collisions.faceDir
    const dxy = [dx, 0]

    const { pointing } = this.player.state
    if (pointing === 'down') {
      dxy[1] = -1
      dxy[0] = 0
    } else if (pointing === 'zenith') {
      dxy[0] = 0
      dxy[1] = 1
      position[1] += body.shapes[0].height // top
    } else if (pointing === 'upward') {
      dxy[1] = 1
      position[1] += 2.5
      position[0] += dx * half_width
    } else if (pointing === 'downward') {
      dxy[1] = -1
      position[1] += 1.5
      position[0] += dx * half_width
    } else {
      // pointing === null
      position[1] += 1.5
      position[0] += dx * half_width
    }
    if (this.player.state.posture === POSTURE.crouch) {
      position[1]--
    }
    return [position, dxy]
  }
}
