<template>
  <canvas width="600" height="400" ref="canvas"></canvas>
  <code id="debug">
    <div>frame: {{ state.frame }}</div>
    <div v-for="line, i in state.collisions">
      {{ i }}: {{ line }}
    </div>
    <div v-for="line, i in state.body">
      {{ i }}: {{ line }}
    </div>
  </code>
</template>

<script>
import game from './game'

export default {
  data() {
    return { state: {collisions: {}, body: {max_speed_y: 0}, frame: 0} }
  },
  mounted() {
    return game(this.$refs.canvas, this.state)
  }
}
</script>
