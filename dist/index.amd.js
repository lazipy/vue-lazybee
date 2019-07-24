define(['vue-router', 'vuex', 'vue-i18n', 'js-cookie', '@/.lazybee'], function (Router, Vuex, Vuei18n, Cookies, options) { 'use strict';

  Router = Router && Router.hasOwnProperty('default') ? Router['default'] : Router;
  Vuex = Vuex && Vuex.hasOwnProperty('default') ? Vuex['default'] : Vuex;
  Vuei18n = Vuei18n && Vuei18n.hasOwnProperty('default') ? Vuei18n['default'] : Vuei18n;
  Cookies = Cookies && Cookies.hasOwnProperty('default') ? Cookies['default'] : Cookies;
  options = options && options.hasOwnProperty('default') ? options['default'] : options;

  let routes = [];
  // 获取所有模块的router.js
  function getRoutes(modules) {
    if (modules) {
      modules.keys().forEach(route => {
        const routerModule = modules(route);
        routes.push(routerModule.default || routerModule);
      });
    }
  }

  // 实例化vue-router
  function instantiation(options) {
    return new Router({
      mode: options.mode,
      base: options.base,
      scrollBehavior: options.scrollBehavior,
      routes: options.routes
    });
  }

  // 添加访问历史记录
  function addVisiteRecord(router, to) {
    if (router.records) {
      if (!router.records.map(v => v.path).includes(to.path)) {
        router.records = [...router.records, to];
      }
    } else {
      router.records = [to];
    }
  }

  // 添加面包屑信息
  function addBreadcrumb(routes, router) {
    routes = [...routes, router.options.routes];
    const indexRoute = getIndexRoute(routes);
    let matched = router.currentRoute.matched.filter(item => item.name);
    const first = matched[0];
    if (first && first.path !== '') {
      router.breadcrumbs = [indexRoute, ...matched];
    } else {
      router.breadcrumbs = [...matched];
    }
  }

  // 获取首页路由
  function getIndexRoute(routes) {
    let indexRoute = routes.find(route => route.path === '');
    delete indexRoute.children;
    return indexRoute;
  }

  /**
   * vue-router-despense
   * @param {*} options
   */
  function VueRouterDespense(options) {
    let router = instantiation(options); // 实例化vue-router

    /**
     * 路由前置钩子
     */
    router.beforeEach((to, from, next) => {
      if (routes.length === 0) {
        getRoutes(options.modules); // 获取模块的router.js
        /**
         * 过滤模块的路由配置，通常用于权限控制
         */
        if (options.filter) {
          routes = options.filter(routes);
        }
        router.addRoutes(routes);
        next({ path: to.path, replace: true });
      }

      if (options.beforeEach) {
        options.beforeEach(to, from, next);
      } else {
        next();
      }
    });

    /**
     *路由后置钩子
     */
    router.afterEach((to, from) => {
      /**
       * 如果 record 为 true ,则记录访问历史记录
       */
      if (options.record) {
        addVisiteRecord(router, to);
      }

      /**
       * 如果 breadcrumb 为 true ,则添加面包屑
       */
      if (options.breadcrumb) {
        addBreadcrumb(routes, router);
      }

      // 执行钩子
      if (options.afterEach) {
        options.afterEach(to, from);
      }
    });

    return router;
  }

  VueRouterDespense.install = Router.install;

  let getters = {};
  let modules = {};

  function autoVuex(options) {
    options.files.keys().forEach(key => {
      // 如果是getters.js
      if (key.startsWith('./getters.js')) {
        getters = options.files(key).default;
        return;
      }
      const path = key.slice(2, -3);
      const storeModule = options.files(key).default;
      modules[path] = storeModule;
    });

    let store = new Vuex.Store({
      getters,
      modules,
      plugins: options.plugins
    });
    return store;
  }

  autoVuex.install = Vuex.install;

  /**
   * 1、配置options自动加载locales文件，支持原有options
   * 2、setLocale()函数一键更换，
   * 3、当前语言缓存cookie
   * 4、data中的多语言支持响应式改变
   */

  let messages = {};

  // 获取所有语言包
  function getLocales(files) {
    files.keys().forEach(key => {
      const name = key.slice(2, -3);
      const locale = files(key).default;
      messages[name] = locale;
    });
  }

  function VueI18nStorge(options) {
    let locale = Cookies.get('locale');
    if (!locale) {
      locale = options.default;
      Cookies.set('locale', locale);
    }
    const files = options.files;
    getLocales(files); // 获取语言包

    delete options.files;
    delete options.default;

    let params = Object.assign({ locale, messages }, options);

    let i18n = new Vuei18n(params);

    i18n.setLocale = function (locale) {
      Cookies.set('locale', locale);
      window.location.reload();
    };

    i18n.getLocale = function () {
      return i18n.locale;
    };

    // 热更新
    if (module.hot) {
      module.hot.accept(files.keys(), function () {
        files.keys().forEach(key => {
          const name = key.slice(2, -3);
          const locale = files(key).default;
          i18n.setLocaleMessage(name, locale);
        });
      });
    }
    return i18n;
  }

  VueI18nStorge.install = Vuei18n.install;

  let defaultOptions = {
    mode: 'history',
    base: process.env.BASE_URL,
    record: true,
    breadcrumb: true,
    scrollBehavior: () => ({ y: 0 }),
    locale: 'zh-CN'
  };

  const params = Object.assign(defaultOptions, options);

  var index = {
    install(Vue) {
      Vue.use(VueRouterDespense);
      Vue.use(autoVuex);
      Vue.use(VueI18nStorge);
    },
    init() {
      let router = new VueRouterDespense({
        mode: params.mode,
        base: params.base,
        record: params.record,
        breadcrumb: params.breadcrumb,
        scrollBehavior: params.scrollBehavior,
        routes: params.routes,
        modules: require.context('@/views', true, /router\.js/),
        filter: params.filter,
        beforeEach: params.beforeEach,
        afterEach: params.afterEach
      });

      let store = new autoVuex({
        files: require.context('@/store', true, /\.js$/)
      });

      let i18n = new VueI18nStorge({
        default: params.locale,
        files: require.context('@/locales', true, /\.js$/)
      });

      return {
        router,
        store,
        i18n
      };
    }
  };

  return index;

});
