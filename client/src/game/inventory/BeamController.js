import { vec2, Body, Circle } from 'p2'
import { BULLET_GROUP, SCENERY_GROUP } from '../constants'

export default class BeamController {
  constructor({ player }) {
    this.player = player
    this.BULLET_SPEED = 1 // TODO 20 is totally arbitrary
  }
  shoot() {
    const [position, dxy] = this.getPositionAndDxy()
    const velocity = [dxy[0] * this.BULLET_SPEED, dxy[1] * this.BULLET_SPEED]
    const bulletBody = new Body({
      mass: 0.05,
      position,
      velocity,
      gravityScale: 0,
      damping: 0,
      collisionResponse: false,
    })
    const bulletShape = new Circle({ radius: 0.2 })
    bulletBody.addShape(bulletShape)
    bulletShape.collisionGroup = BULLET_GROUP
    bulletShape.collisionMask = SCENERY_GROUP
    this.player.world.addBody(bulletBody)
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
      dxy[1] = 1
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
    return [position, dxy]
  }
}
