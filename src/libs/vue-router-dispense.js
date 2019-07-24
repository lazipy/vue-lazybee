import Router from 'vue-router'

let routes = []
// 获取所有模块的router.js
function getRoutes(modules) {
  if (modules) {
    modules.keys().forEach(route => {
      const routerModule = modules(route)
      routes.push(routerModule.default || routerModule)
    })
  }
}

// 实例化vue-router
function instantiation(options) {
  return new Router({
    mode: options.mode,
    base: options.base,
    scrollBehavior: options.scrollBehavior,
    routes: options.routes
  })
}

// 添加访问历史记录
function addVisiteRecord(router, to) {
  if (router.records) {
    if (!router.records.map(v => v.path).includes(to.path)) {
      router.records = [...router.records, to]
    }
  } else {
    router.records = [to]
  }
}

// 添加面包屑信息
function addBreadcrumb(routes, router) {
  routes = [...routes, router.options.routes]
  const indexRoute = getIndexRoute(routes)
  let matched = router.currentRoute.matched.filter(item => item.name)
  const first = matched[0]
  if (first && first.path !== '') {
    router.breadcrumbs = [indexRoute, ...matched]
  } else {
    router.breadcrumbs = [...matched]
  }
}

// 获取首页路由
function getIndexRoute(routes) {
  let indexRoute = routes.find(route => route.path === '')
  delete indexRoute.children
  return indexRoute
}

/**
 * vue-router-despense
 * @param {*} options
 */
function VueRouterDespense(options) {
  let router = instantiation(options) // 实例化vue-router

  /**
   * 路由前置钩子
   */
  router.beforeEach((to, from, next) => {
    if (routes.length === 0) {
      getRoutes(options.modules) // 获取模块的router.js
      /**
       * 过滤模块的路由配置，通常用于权限控制
       */
      if (options.filter) {
        routes = options.filter(routes)
      }
      router.addRoutes(routes)
      next({ path: to.path, replace: true })
    }

    if (options.beforeEach) {
      options.beforeEach(to, from, next)
    } else {
      next()
    }
  })

  /**
   *路由后置钩子
   */
  router.afterEach((to, from) => {
    /**
     * 如果 record 为 true ,则记录访问历史记录
     */
    if (options.record) {
      addVisiteRecord(router, to)
    }

    /**
     * 如果 breadcrumb 为 true ,则添加面包屑
     */
    if (options.breadcrumb) {
      addBreadcrumb(routes, router)
    }

    // 执行钩子
    if (options.afterEach) {
      options.afterEach(to, from)
    }
  })

  return router
}

VueRouterDespense.install = Router.install

export default VueRouterDespense
