<template>
  <div>
    <game-canvas :game="game" @click="click" />
    <debug-game :game="game" v-if="game" />
  </div>
</template>

<script>
import Mousetrap from '@unrest/vue-mousetrap'
import DebugGame from '@/components/DebugGame'
import GameCanvas from '@/components/Game'

import Game from '@/game/Game'

export default {
  __route: {
    path: '/play/',
  },
  components: { DebugGame, GameCanvas },
  mixins: [Mousetrap.Mixin],
  data() {
    return { game: null }
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
    this.game = new Game(document.getElementById('game-canvas'))
    this.game.on('draw', this.draw)
  },
  unmounted() {
    this.game.close()
    this.game.off('draw', this.draw)
  },
  methods: {
    click(_event, data) {
      console.log(data) // eslint-disable-line
    },
    draw(_event, _data) {
      // TODO this will eventually be dynamic
      this.game.ui = { hover: true }
    },
  },
}
</script>
