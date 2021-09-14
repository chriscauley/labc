import unrest from '@unrest/vue'

import admin_options from './admin'
import world from './world'
import room from './room'

const store = unrest.Store({ room, world })
const admin_modules = ['room', 'world']

admin_modules.forEach((model_name) =>
  unrest.admin.register({
    model_name,
    storage: store[model_name],
    admin_options: admin_options[model_name],
  }),
)


export default store