// Bricks are destructable terrain
import { SCENERY_GROUP, PLAYER_GROUP, BULLET_GROUP } from './constants'
import p2 from 'p2'

export default class Brick {
  constructor(options) {
    const { game, x, y, width = 1, height = 1, type, hp = 1, max_hp = hp } = options
    Object.assign(this, { game, type, x, y, width, height, hp, max_hp })
    this.makeBody()
    this.game.addEntity(this)
  }
  makeBody() {
    const { x, y, width, height } = this
    const collisionMask = PLAYER_GROUP | BULLET_GROUP
    const shape = new p2.Box({ collisionGroup: SCENERY_GROUP, collisionMask, width, height })
    const body = (this.body = new p2.Body({ position: [x, y] }))
    this.id = this.body.id
    body.addShape(shape)
  }
  damage(event) {
    this.hp -= event.amount
    if (this.hp <= 0) {
      this.destroy()
    }
  }
  destroy() {
    this.game.removeEntity(this)
  }
}
