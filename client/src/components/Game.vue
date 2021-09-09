<template>
  <canvas width="800" height="700" ref="canvas"></canvas>
  <code id="debug" style="display: flex">
    <div>
      <div>frame: {{ state.frame }}</div>
      <div v-for="(line, i) in state.player" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
    <div>
      <div v-for="(line, i) in state.collisions" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
    <div>
      <div v-for="(line, i) in state.keys" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
    <div>
      <div v-for="(line, i) in state.state" :key="i">{{ i }}: {{ pprint(line) }}</div>
    </div>
  </code>
</template>

<script>
import Mousetrap from '@unrest/vue-mousetrap'

import game from '@/game/Game'

export default {
  mixins: [Mousetrap.Mixin],
  data() {
    return {
      game: null,
      state: {
        state: {},
        collisions: {},
        keys: {},
        player: { max_speed_y: 0, bomb_hits: 0 },
        frame: 0,
      },
    }
  },
  computed: {
    mousetrap() {
      if (!this.game) {
        return {}
      }
      const { up, left, right, down, aimup, aimdown, shoot1, jump } = this.game.actions
      return { up, left, right, down, q: aimup, a: aimdown, z: shoot1, x: jump }
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
