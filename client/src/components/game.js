import p2 from 'p2'
import KinematicCharacterController from './KinematicCharacterController'

// Collision groups
const SCENERY_GROUP = 0x01
const PLAYER_GROUP = 0x02
const fixedDeltaTime = 1 / 60
const MAX_SUB_STEPS = 10

export default class Game {
  constructor(canvas, state) {
    Object.assign(this, { canvas, state })
    this.resize()

    this.init()
    this.animate = (time) => this._animate(time)
    requestAnimationFrame(this.animate)
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
    })

    this.ctx.lineWidth = 1 / this.zoom

    // Init world
    this.world = new p2.World()

    // Add some scenery
    this.addStaticBox(0, 0, 1, 1)
    this.addStaticBox(-3, 3, 3, 1)
    this.addStaticBox(0, -1, 7, 1)
    this.addStaticBox(-6, 0, 1, 7, Math.PI / 4)
    this.addStaticBox(4, 6, 1, 100)
    this.addStaticBox(0, 19, 1, 31)
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
    this.player = new KinematicCharacterController({
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
    this.player.on('raycast', (evt) => {
      this.rayDebugData.push([evt.ray.from[0], evt.ray.from[1], evt.ray.to[0], evt.ray.to[1]])
    })

    // Set up key listeners
    let left = 0
    let right = 0
    window.addEventListener('keydown', (evt) => {
      switch (evt.keyCode) {
        case 38: // up key
        case 32:
          this.player.setJumpKeyState(true)
          break // space key
        case 39:
          right = 1
          break // right key
        case 37:
          left = 1
          break // left key
      }
      this.player.input[0] = right - left
    })
    window.addEventListener('keyup', (evt) => {
      switch (evt.keyCode) {
        case 38: // up
        case 32:
          this.player.setJumpKeyState(false)
          break
        case 39:
          right = 0
          break
        case 37:
          left = 0
          break
      }
      this.player.input[0] = right - left
    })
  }

  addStaticCircle(x, y, radius, angle = 0) {
    var body = new p2.Body({ position: [x, y], angle: angle })
    body.addShape(new p2.Circle({ collisionGroup: SCENERY_GROUP, radius }))
    this.world.addBody(body)
  }

  addStaticBox(x, y, width, height, angle = 0) {
    var shape = new p2.Box({ collisionGroup: SCENERY_GROUP, width, height })
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

    p2.vec2.lerp(
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
    requestAnimationFrame(this.animate)

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
    const max_speed_y = Math.max(this.state.body.max_speed_y, Math.abs(velocity[1]))
    Object.assign(this.state.body, { position, velocity, max_speed_y, gravity })
  }
}
