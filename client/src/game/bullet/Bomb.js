import p2 from 'p2'
import { SCENERY_GROUP, BULLET_GROUP, DIRECTIONS } from '../constants'

const { Ray, RaycastResult, vec2 } = p2
const BOMB_DISTANCE = 0.75

export default class Bomb {
  constructor({ game, player }) {
    Object.assign(this, { game, player })
    this.radius = 0.1
    this.type = 'bomb'
    this.makeShape()
    const [x, y] = this.body.position
    this.xy = [Math.floor(x), Math.floor(y)]
    this.created = this.game.world.time
    this.game.world.on('preSolve', this.tick)
  }
  tick = () => {
    const dt = this.game.world.time - this.created
    if (dt > 0.8) {
      this.flash = dt < 0.9
    }
    if (dt > 1) {
      this.detonate()
      this.game.world.off('preSolve', this.tick)
    }
  }
  detonate() {
    const { position } = this.body
    const ray = new Ray({
      mode: Ray.ALL,
      from: position,
      callback: (result) => {
        result.body &&
          this.game.world.emit({
            damage: {
              type: 'bomb',
              player_id: this.game.player.id,
              amount: 1,
              body_id: result.body.id,
            },
            type: 'bomb-damage',
          })
      },
    })
    const result = new RaycastResult()
    ray.collisionMask = SCENERY_GROUP
    DIRECTIONS.forEach((dxy) => {
      result.reset()
      ray.to = [ray.from[0] + dxy[0] * BOMB_DISTANCE, ray.from[1] + dxy[1] * BOMB_DISTANCE]
      ray.update()
      this.game.world.raycast(result, ray)
    })
    this.game.removeEntity(this)
  }
  makeShape() {
    const position = vec2.copy([0, 0], this.game.player.body.position)
    this.body = new p2.Body({
      position,
      gravityScale: 0,
      collisionGroup: BULLET_GROUP,
    })
    this.body.addShape(new p2.Circle({ radius: this.radius, collisionGroup: BULLET_GROUP }))
    this.id = this.body.id
    this.game.addEntity(this)
    this.body._entity = this
  }
  draw(ctx) {
    ctx.strokeStyle = this.flash ? 'red' : 'white'
    ctx.fillStyle = this.flash ? 'white' : 'red'
    ctx.lineWidth = 0.05
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
    ctx.closePath()
  }
}
