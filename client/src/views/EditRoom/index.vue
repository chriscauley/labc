<template>
  <div v-if="room">
    <game-canvas />
    <toolbar />
  </div>
</template>

<script>
import GameCanvas from '@/components/Game'
import Toolbar from './Toolbar'

export default {
  __route: {
    path: '/room/edit/:room_id/',
  },
  components: { GameCanvas, Toolbar },
  computed: {
    room() {
      return this.$store.room.getOne(this.$route.params.room_id)
    },
  },
  methods: {
    mousemove(e) {},
    click(e) {},
  },
}
</script>
