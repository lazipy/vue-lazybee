#### 介绍

lazybee 直译为 “懒惰的蜜蜂”，希望这套框架能为一部分开发者带来便捷，能帮助开发者偷一些懒，但是我们依然要像蜜蜂一样勤劳。

lazybee 是一套企业级前端开发框架，秉承 reflux + mvvm 架构方式，采用“纵切”的方式来规划文件目录，这为以后往“微前端”架构带来了一些便利。

#### 面向对象

- JavaScript 基础扎实
- 有 vue 全家桶使用经验并有实战经验
- 了解 Node.js 及 webpack 构建工具
- 有一定组织架构能力

#### 所需环境

- webpack
- vue.js

#### 目前最适合的项目

- 有较多模块，有复杂的数据通讯及组件通讯问题
- 有多语言要求的项目
- 多人协同开发，跨部门合作

#### 开始

lazybee 基于 vue.js + vue-router + vuex，我们推荐使用 vue-cli 3.0来创建一个项目。

#### 安装 vue-cli3

```
npm install -g @vue/cli
# OR
yarn global add @vue/cli
```

#### 创建一个项目

暂时 vue-router 和 vuex 是必选的，在创建项目的时候，我们注意一下这一点，同时目前来说，lazybee 推荐使用 standard 的代码风格。以后来说，希望给开发者多个选择，这点会努力加进来的。

```
vue create lazybee-demo
cd lazybee-demo
vue add lazybee
```

可以在 main.js 中看到，lazybee 的引用

```
import Vue from 'vue'
import App from './App.vue'
import lazybee from 'vue-lazybee'

Vue.use(lazybee)
Vue.config.productionTip = false

new Vue({
  ...lazybee.init(),
  render: h => h(App)
}).$mount('#app')

```

#### 目录及约定

在文件及目录组织上，lazybee 借鉴了 umi.js 的思想，更倾向于选择约定的方式。

```
.
├── dist/                          // 默认的 build 输出目录
├── mock/                          // mock 文件所在目录，基于 express
├── public/                        // 公共目录
└── src/                           // 源码目录，可选
    ├── assets/                    // 静态文件，存放一些图片之类
    ├── components/                // 组件
    ├── locales/                   // 多语言语言包目录
    ├── models/                    // 全局的 store
    ├── pages/                     // 页面目录，里面的文件即路由
    ├── services/                  // 服务请求
    ├── App.vue                    // 应用组件入口 
    ├── config.js                  // lazybee 的配置文件
    └── main.js                    // 入口文件
├── .env                           // 环境变量
└── package.json
```

这是 lazybee 一个大概的目录划分，接下来我们会深入细节去解释每个目录下面的约定。

#### Router

lazybee 路由采用约定与下发的结合方式。

首先 config.js 里面有一个 routes 字段，用来配置 layout 路由，通常情况下，该部分路由也是白名单路由。

```
routes: [
    {
      path: '/',
      indexRouter: true,
      name: 'welcome',
      component: () => import('@/pages/welcome.vue'),
      meta: {
        title: '欢迎'
      }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/about.vue'),
      meta: {
        title: '关于'
      }
    }
]
```

其他模块路由，在 pages 目录下分模块定义即可

```
└── pages/
    ├── a/                  // 这是 a 模块
        ├── router.js       // 这是 a 模块 的路由配置
    ├── b/                  // 这是 b 模块
        ├── router.js       // 这是 b 模块 的路由配置
```

##### 其他配置项

- record（Boolean） ：是否开启路由访问记录，在 vue 组件中可以通过 this.$router.records 访问
- breadcrumb（Boolean）：是否开启面包屑记录，在 vue 组件中可以通过 this.$router.breadcrumbs 访问
- filter（Function(routes)）：路由配置项的过滤器函数，函数接收一个参数 routes，是过滤前的路由配置信息，函数需要返回一个数组（Array）作为新的路由配置项。该函数通常可以用来做权限控制。
- beforeEach：路由前置钩子函数，同 vue-router
- afterEach：路由后置钩子函数，同 vue-router

#### Model

lazybee 借鉴了 dva 的思想，将 vuex 随模块划分，同时 vuex 一些初始化的操作也已经封装，我们只需要严格按照 dva 的方式来开发 vuex 即可。

##### 注册

model 分两类，一是全局 model，二是页面 model。全局 model 存于 /src/models/ 目录，所有页面都可引用；页面 model 不能被其他页面所引用。

规则如下：

- src/models/**/*.js 为 global model
- src/pages/**/model.js 为 page model
举个例子

```
+ src
  + models
    - g.js
  + pages
    + c
      - model.js
```

如上目录：

- bal model 为 src/models/g.js
- /c 的 page model 为 src/pages/c/model.js

通常使用 umi 或者 dva 的开发者，会对这套 model 管理十分熟悉。

#### Services

服务请求，在 lazybee 中封装了一些初始化操作，由于每个团队的接口对接规范不同，所以 lazybee 在这块，仅仅是暴露了一个请求实例。

```
import { request } from 'vue-lazybee'
```

##### 配置


Options | 说明 | 默认值
---|---|---
baseURL（String） | 接口默认的根路径 |  无
headers（Object） | 配置请求头，同 axios | { Accept: 'application/json' }
timeout（Number） | 超时时间 |  60 * 1000
withCredentials（Boolean） | 是否开启cookie共享 | false  
requestConfigCallBack（Function） | 请求前拦截器的配置函数 | 无  
requestErrorCallBack（Function） | 请求前拦截器报错的回调函数 | 无  
responseConfigCallBack（Function） | 响应前拦截器的配置函数 | 无  
responseErrorCallBack（Function） | 响应前拦截器报错的回调函数 | 无  

#### Mock

lazybee 指定 /mock 文件下的 js 文件为 mock 文件，mock 编写采用 express 方式。

举个例子

```
└── mock/
    ├── user.js       // 这是用户相关接口
```

user.js 的内容如下

```
module.exports = [
  {
    url: '/user/login',          // 接口地址
    type: 'get',                 // 请求方式
    response: (req, res) => {    // 响应处理
      res.json({
        code: '0',
        msg: '登录成功',
        data: {
          id: 10,
          name: '李子屏'
        }
      })
    }
  }
]
```

我们请求 '/user/login' 接口即可。

同时 mock 支持了热更新，只要修改 user.js 文件，mock 的接口也要实时刷新。

mock 也支持与 Mock.js 及其他 mock 插件同时使用。

#### 多语言

lazybee 规定 locales 文件下为语言包文件目录。同时 lazybee 将多语言的初始化操作封装了起来。只需要在页面中使用即可，使用方式完全兼容 vue-i18n。

```
{{ $t('welcome') }}
```

同时多语言提供了 setLocale 和 getLocale 两个函数，分别用于设置当前语言和获取当前语言。lazybee 也会将当前语言缓存在 cookie 中，这往往会在接口请求时使用到。

在将来，会为多语言打造一个自动翻译的功能，这在开发环境通常是有用的。
