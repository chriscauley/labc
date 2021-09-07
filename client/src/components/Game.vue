<template>
  <canvas width="600" height="400" ref="canvas"></canvas>
  <code id="debug">
    <div v-for="line, i in state.debug">
      {{ line }}
    </div>
  </code>
</template>

<script>
import game from './game'

export default {
  data() {
    return { game: null, state: {} }
  },
  mounted() {
    return this.game = game(this.$refs.canvas, this.state)
  }
}
</script>
