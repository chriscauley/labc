import p2 from 'p2'
import { SCENERY_GROUP, BULLET_GROUP, DIRECTIONS } from '../constants'

const { Ray, RaycastResult, vec2 } = p2

export default class Bomb {
  constructor({ game, player }) {
    Object.assign(this, { game, player })
    this.type = 'bomb'
    this.makeShape()
    const [x, y] = this.body.position
    this.xy = [Math.floor(x), Math.floor(y)]
    setTimeout(() => this.detonate(), 1000)
  }
  detonate() {
    const { position } = this.body
    const ray = new Ray({
      mode: Ray.ALL,
      from: position,
      callback: (result) => {
        result.body &&
          this.game.world.emit({
            body: result.body,
            player_id: this.game.player.id,
            type: 'bomb-damage',
          })
      },
    })
    const result = new RaycastResult()
    ray.collisionMask = SCENERY_GROUP
    DIRECTIONS.forEach((dxy) => {
      result.reset()
      ray.to = [ray.from[0] + dxy[0] * 0.5, ray.from[1] + dxy[1] * 0.5]
      ray.update()
      this.game.world.raycast(result, ray)
    })
    this.game.world.removeBody(this.body)
    delete this.game.entities[this.id]
  }
  makeShape() {
    const position = vec2.copy([0, 0], this.game.player.body.position)
    this.body = new p2.Body({
      position,
      gravityScale: 0,
      collisionGroup: BULLET_GROUP,
    })
    this.body.addShape(new p2.Circle({ radius: 0.1, collisionGroup: BULLET_GROUP }))
    this.game.world.addBody(this.body)
    this.id = this.body.id
    this.game.entities[this.id] = this
  }
}
