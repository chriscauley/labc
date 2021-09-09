import p2 from 'p2'
import { SCENERY_GROUP, BULLET_GROUP, DIRECTIONS } from '../constants'

const { Ray, RaycastResult, vec2 } = p2
const BOMB_DISTANCE = 0.75

class Bomb {
  constructor({ game, player }) {
    Object.assign(this, { game, player })
    this.radius = 0.1
    this.type = 'bomb'
    this.makeShape()
    const [x, y] = this.body.position
    this.xy = [Math.floor(x), Math.floor(y)]
    this.created = this.game.world.time
    this.detonate_at = this.game.world.time + 1
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
              player_id: this.player.id,
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
    this.detonated = true
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
    const dt = this.detonate_at - this.game.world.time
    let colors = ['white', 'red']
    if (dt > 1) {
      colors = ['gray', 'white']
    }
    if (dt < 0.2 && dt > 0.1) {
      colors = ['red', 'white']
    }
    ;[ctx.fillStyle, ctx.strokeStyle] = colors
    ctx.lineWidth = 0.05
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
    ctx.closePath()
  }
}

export default class BombController {
  constructor({ game, player }) {
    Object.assign(this, { game, player })
    this.bombs = []
    this.game.world.on('preSolve', this.tick)
  }
  tick = () => {
    this.bombs.forEach((bomb) => {
      const dt = bomb.detonate_at - bomb.game.world.time
      if (dt < 0.3) {
        bomb.flash = dt > 0.15
      }
      if (dt <= 0) {
        bomb.detonate()
      }
    })
    this.bombs = this.bombs.filter((bomb) => !bomb.detonated)
  }
  press() {
    const { player, game } = this
    const bomb = new Bomb({ player, game })
    this.bombs.push(bomb)
    if (this.player.tech.bomb_triggered) {
      bomb.detonate_at += 24 * 60 * 60
    }
    if (this.player.tech.bomb_linked) {
      this.bombs.forEach((b) => (b.detonate_at = bomb.detonate_at))
    }
  }
  release() {
    const last_bomb = this.bombs[this.bombs.length - 1]
    if (this.player.tech.bomb_triggered) {
      last_bomb.detonate_at = this.game.world.time + 1
    }
    if (this.player.tech.bomb_linked) {
      this.bombs.forEach((b) => (b.detonate_at = last_bomb.detonate_at))
    }
  }
}
