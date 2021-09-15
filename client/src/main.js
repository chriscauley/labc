import unrest from '@unrest/vue'
import form from '@unrest/vue-form'
import { createApp } from 'vue'

import router from '@/router'
import App from '@/App.vue'
import store from '@/store'

import '@unrest/tailwind/dist.css'
import '@/styles/base.scss'

createApp(App)
  .use(router)
  .use(store)
  .use(form.plugin)
  .use(unrest.plugin)
  .use(unrest.ui)
  .mount('#app')
