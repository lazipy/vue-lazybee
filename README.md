# vue-lazybee

#### 安装

```
npm install vue-lazybee -S
```

#### 使用

```
import Vue from 'vue'
import App from './App.vue'
import lazybee from './index'

Vue.use(lazybee)
Vue.config.productionTip = false

new Vue({
  ...lazybee.init(),
  render: h => h(App)
}).$mount('#app')
```