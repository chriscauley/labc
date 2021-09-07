<template>
  <canvas width="800" height="700" ref="canvas"></canvas>
  <code id="debug" style="display: flex">
    <div>
      <div>frame: {{ state.frame }}</div>
      <div v-for="(line, i) in state.body" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
    <div>
      <div v-for="(line, i) in state.collisions" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
  </code>
</template>

<script>
import Mousetrap from '@unrest/vue-mousetrap'

import game from '@/game/Game'

export default {
  mixins: [Mousetrap.Mixin],
  data() {
    return { game: null, state: { collisions: {}, body: { max_speed_y: 0 }, frame: 0 } }
  },
  computed: {
    mousetrap() {
      if (!this.game) {
        return {}
      }
      const { up, left, right } = this.game.actions
      return { 'up,space': up, left, right }
    },
  },
  mounted() {
    return (this.game = new game(this.$refs.canvas, this.state))
  },
  unmounted() {
    this.game.close()
  },
  methods: {
    pprint(i) {
      if (i instanceof Float32Array) {
        i = [...i]
      }
      if (Array.isArray(i)) {
        return i
          .slice()
          .map(this.pprint)
          .join(',')
      } else if (typeof i === 'number') {
        return i.toFixed(2)
      }
      return i
    },
  },
}
</script>
