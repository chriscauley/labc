<template>
  <canvas width="800" height="800" ref="canvas"></canvas>
  <code id="debug" style="display: flex">
    <div>
      <div>frame: {{ state.frame }}</div>
      <div v-for="line, i in state.body">
        {{ i }}: {{ pprint(line) }}
      </div>
    </div>
    <div>
      <div v-for="line, i in state.collisions">
        {{ i }}: {{ pprint(line) }}
      </div>
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
  },
  methods: {
    pprint(i) {
      if (i instanceof Float32Array) {
        i = [...i]
      }
      if (Array.isArray(i)) {
        return i.slice().map(this.pprint).join(',')
      } else if (typeof i === 'number') {
        return i.toFixed(2)
      }
      return i
    }
  }
}
</script>
