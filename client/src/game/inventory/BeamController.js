import { vec2, Body, Circle } from 'p2'
import { BULLET_GROUP, SCENERY_GROUP } from '../constants'

export default class BeamController {
  constructor({ player }) {
    this.player = player
  }
  shoot() {
    const position = vec2.copy([0, 0], this.player.body.position)
    let { faceDir } = this.player.collisions
    let y_dir = 0
    const { pointing } = this.player.state
    if (pointing === 'zenith') {
      faceDir = 0
    } else if (pointing === 'upward') {
      y_dir = 1
    } else if (pointing === 'downward') {
      y_dir = -1
    }
    const velocity = [faceDir * 5, y_dir * 5]
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
}
