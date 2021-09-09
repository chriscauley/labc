<template>
  <game />
</template>

<script>
import Game from '@/components/Game'

export default {
  __route: {
    path: '/play/',
  },
  components: { Game },
}
</script>
