import p2 from 'p2'

import Player from './Player'
import { SCENERY_GROUP, BULLET_GROUP, PLAYER_GROUP } from './constants'
import Bomb from './bullet/Bomb'

// Collision groups
const fixedDeltaTime = 1 / 60
const MAX_SUB_STEPS = 10

window.p2 = p2

const { vec2 } = p2

export default class Game {
  constructor(canvas, state) {
    Object.assign(this, { canvas, state })
    this.resize()

    this.init()
    this.animate = (time) => this._animate(time)
    requestAnimationFrame(this.animate)
    this.entities = {}
  }

  resize() {
    this.ctx = this.canvas.getContext('2d')
  }

  init() {
    // Init canvas
    Object.assign(this, {
      cameraPos: [0, 0],
      zoom: 50,
      rayDebugData: [],
      keys: { left: 0, right: 0, up: 0, down: 0 },
    })

    this.ctx.lineWidth = 1 / this.zoom

    // Init world
    this.world = new p2.World()
    window.urGame = this
    // this.world.on('impact', (e) => console.log(e)) // non-player collisions

    // Add some scenery
    this.addStaticBox(0, 0, 1, 1)
    this.addStaticBox(-3, 3, 3, 1)
    this.addStaticBox(0, -1, 7, 1)
    this.addStaticBox(-6, 0, 1, 7, Math.PI / 4)
    this.addStaticBox(4, 5, 1, 100)
    this.addStaticBox(0, 5, 1, 1)
    this.addStaticCircle(-9, 1, 2, 1)

    // Add a character body
    this.characterBody = new p2.Body({
      mass: 0,
      position: [0, 3],
      fixedRotation: true,
      damping: 0,
      type: p2.Body.KINEMATIC,
    })
    this.characterBody.addShape(
      new p2.Box({
        width: 8 / 16,
        height: 2,
        collisionGroup: PLAYER_GROUP,
      }),
    )
    this.world.addBody(this.characterBody)

    // Create the character controller
    this.player = new Player({
      world: this.world,
      body: this.characterBody,
      collisionMask: SCENERY_GROUP,
      velocityXSmoothing: 0.0001,
      skinWidth: 0.1,
    })

    // Update the character controller after each physics tick.
    this.world.on('postStep', () => {
      this.rayDebugData.length = 0
      this.player.update(this.world.lastTimeStep)
    })

    // Store ray debug data
    this.player.on('raycast', ({ ray }) => {
      this.rayDebugData.push([ray.from[0], ray.from[1], ray.to[0], ray.to[1]])
    })

    this.player.on('collide', (_result) => {
      // console.log(_result)
    })

    this.world.on('bomb-damage', (_result) => {
      this.state.player.bomb_hits += 1 // TODO this is debug information only
      // console.log(_result)
    })

    // Set up key listeners
    this.actions = {
      up: {
        keydown: () => {
          this.player.setJumpKeyState(true)
          this.setKeys({ up: 1 })
        },
        keyup: () => {
          this.player.setJumpKeyState(false)
          this.setKeys({ up: 0 })
        },
      },
      left: {
        keydown: () => this.setKeys({ left: 1 }),
        keyup: () => this.setKeys({ left: 0 }),
      },
      right: {
        keydown: () => this.setKeys({ right: 1 }),
        keyup: () => this.setKeys({ right: 0 }),
      },
      shoot: {
        keydown: () => this.shoot(),
      },
    }
  }

  close() {
    cancelAnimationFrame(this._frame)
  }

  setKeys(keys) {
    Object.assign(this.keys, keys)
    this.player.input[0] = this.keys.right - this.keys.left
  }

  shoot() {
    const position = vec2.copy([0, 0], this.player.body.position)
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
      new Bomb({ game: this, player: this.player })
    }
  }

  addStaticCircle(x, y, radius, angle = 0) {
    var body = new p2.Body({ position: [x, y], angle: angle })
    body.addShape(new p2.Circle({ collisionGroup: SCENERY_GROUP, radius }))
    this.world.addBody(body)
  }

  addStaticBox(x, y, width, height, angle = 0) {
    const collisionMask = PLAYER_GROUP | BULLET_GROUP
    var shape = new p2.Box({ collisionGroup: SCENERY_GROUP, collisionMask, width, height })
    var body = new p2.Body({
      position: [x, y],
      angle: angle,
    })
    body.addShape(shape)
    this.world.addBody(body)
  }

  drawBody(body) {
    var x = body.interpolatedPosition[0],
      y = body.interpolatedPosition[1],
      s = body.shapes[0]
    this.ctx.save()
    this.ctx.translate(x, y) // Translate to the center of the box
    this.ctx.rotate(body.interpolatedAngle) // Rotate to the box body frame

    if (s instanceof p2.Box) {
      this.ctx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height)
    } else if (s instanceof p2.Circle) {
      this.ctx.beginPath()
      this.ctx.arc(0, 0, s.radius, 0, 2 * Math.PI)
      this.ctx.fill()
      this.ctx.closePath()
    }

    this.ctx.restore()
  }

  drawRay([startX, startY, endX, endY]) {
    this.ctx.beginPath()
    this.ctx.moveTo(startX, startY)
    this.ctx.lineTo(endX, endY)
    this.ctx.stroke()
    this.ctx.closePath()
  }

  render() {
    const { width, height } = this.canvas
    this.ctx.fillStyle = 'black'
    this.ctx.fillRect(0, 0, width, height)

    // Transform the canvas
    // Note that we need to flip the y axis since Canvas pixel coordinates
    // goes from top to bottom, while physics does the opposite.
    this.ctx.save()
    this.ctx.translate(width / 2, height / 2) // Translate to the center
    this.ctx.scale(this.zoom, -this.zoom) // Zoom in and flip y axis

    vec2.lerp(
      this.cameraPos,
      this.cameraPos,
      [-this.characterBody.interpolatedPosition[0], -this.characterBody.interpolatedPosition[1]],
      0.05,
    )
    this.ctx.translate(this.cameraPos[0], this.cameraPos[1])

    // Draw all bodies
    this.ctx.strokeStyle = 'none'
    this.ctx.fillStyle = 'white'
    for (var i = 0; i < this.world.bodies.length; i++) {
      var body = this.world.bodies[i]
      this.drawBody(body)
    }

    this.ctx.strokeStyle = 'red'
    this.rayDebugData.forEach((debug) => this.drawRay(debug))

    // Restore transform
    this.ctx.restore()
  }

  // Animation loop
  _animate(time) {
    this.state.frame++
    cancelAnimationFrame(this._frame)
    this._frame = requestAnimationFrame(this.animate)

    // Compute elapsed time since last frame
    let deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0
    deltaTime = Math.min(1 / 10, deltaTime)

    // Move physics bodies forward in time
    this.world.step(fixedDeltaTime, deltaTime, MAX_SUB_STEPS)

    // Render scene
    this.render()

    this.updateDebugLog()

    this.lastTime = time
  }

  updateDebugLog() {
    Object.assign(this.state.collisions, this.player.collisions)
    const { position } = this.player.body
    const { velocity, gravity } = this.player
    const max_speed_y = Math.max(this.state.player.max_speed_y, Math.abs(velocity[1]))
    Object.assign(this.state.player, { position, velocity, max_speed_y, gravity })
  }
}
