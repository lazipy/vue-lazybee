define(['exports', 'vuex', '@/config.js'], function (exports, Vuex, options) { 'use strict';

  Vuex = Vuex && Vuex.hasOwnProperty('default') ? Vuex['default'] : Vuex;
  options = options && options.hasOwnProperty('default') ? options['default'] : options;

  /*!
    * vue-router v3.0.7
    * (c) 2019 Evan You
    * @license MIT
    */
  /*  */

  function assert(condition, message) {
    if (!condition) {
      throw new Error("[vue-router] " + message);
    }
  }

  function warn(condition, message) {
    if (process.env.NODE_ENV !== 'production' && !condition) {
      typeof console !== 'undefined' && console.warn("[vue-router] " + message);
    }
  }

  function isError(err) {
    return Object.prototype.toString.call(err).indexOf('Error') > -1;
  }

  function extend(a, b) {
    for (var key in b) {
      a[key] = b[key];
    }
    return a;
  }

  var View = {
    name: 'RouterView',
    functional: true,
    props: {
      name: {
        type: String,
        default: 'default'
      }
    },
    render: function render(_, ref) {
      var props = ref.props;
      var children = ref.children;
      var parent = ref.parent;
      var data = ref.data;

      // used by devtools to display a router-view badge
      data.routerView = true;

      // directly use parent context's createElement() function
      // so that components rendered by router-view can resolve named slots
      var h = parent.$createElement;
      var name = props.name;
      var route = parent.$route;
      var cache = parent._routerViewCache || (parent._routerViewCache = {});

      // determine current view depth, also check to see if the tree
      // has been toggled inactive but kept-alive.
      var depth = 0;
      var inactive = false;
      while (parent && parent._routerRoot !== parent) {
        var vnodeData = parent.$vnode && parent.$vnode.data;
        if (vnodeData) {
          if (vnodeData.routerView) {
            depth++;
          }
          if (vnodeData.keepAlive && parent._inactive) {
            inactive = true;
          }
        }
        parent = parent.$parent;
      }
      data.routerViewDepth = depth;

      // render previous view if the tree is inactive and kept-alive
      if (inactive) {
        return h(cache[name], data, children);
      }

      var matched = route.matched[depth];
      // render empty node if no matched route
      if (!matched) {
        cache[name] = null;
        return h();
      }

      var component = cache[name] = matched.components[name];

      // attach instance registration hook
      // this will be called in the instance's injected lifecycle hooks
      data.registerRouteInstance = function (vm, val) {
        // val could be undefined for unregistration
        var current = matched.instances[name];
        if (val && current !== vm || !val && current === vm) {
          matched.instances[name] = val;
        }
      }

      // also register instance in prepatch hook
      // in case the same component instance is reused across different routes
      ;(data.hook || (data.hook = {})).prepatch = function (_, vnode) {
        matched.instances[name] = vnode.componentInstance;
      };

      // register instance in init hook
      // in case kept-alive component be actived when routes changed
      data.hook.init = function (vnode) {
        if (vnode.data.keepAlive && vnode.componentInstance && vnode.componentInstance !== matched.instances[name]) {
          matched.instances[name] = vnode.componentInstance;
        }
      };

      // resolve props
      var propsToPass = data.props = resolveProps(route, matched.props && matched.props[name]);
      if (propsToPass) {
        // clone to prevent mutation
        propsToPass = data.props = extend({}, propsToPass);
        // pass non-declared props as attrs
        var attrs = data.attrs = data.attrs || {};
        for (var key in propsToPass) {
          if (!component.props || !(key in component.props)) {
            attrs[key] = propsToPass[key];
            delete propsToPass[key];
          }
        }
      }

      return h(component, data, children);
    }
  };

  function resolveProps(route, config) {
    switch (typeof config) {
      case 'undefined':
        return;
      case 'object':
        return config;
      case 'function':
        return config(route);
      case 'boolean':
        return config ? route.params : undefined;
      default:
        if (process.env.NODE_ENV !== 'production') {
          warn(false, "props in \"" + route.path + "\" is a " + typeof config + ", " + "expecting an object, function or boolean.");
        }
    }
  }

  /*  */

  var encodeReserveRE = /[!'()*]/g;
  var encodeReserveReplacer = function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  };
  var commaRE = /%2C/g;

  // fixed encodeURIComponent which is more conformant to RFC3986:
  // - escapes [!'()*]
  // - preserve commas
  var encode = function (str) {
    return encodeURIComponent(str).replace(encodeReserveRE, encodeReserveReplacer).replace(commaRE, ',');
  };

  var decode = decodeURIComponent;

  function resolveQuery(query, extraQuery, _parseQuery) {
    if (extraQuery === void 0) extraQuery = {};

    var parse = _parseQuery || parseQuery;
    var parsedQuery;
    try {
      parsedQuery = parse(query || '');
    } catch (e) {
      process.env.NODE_ENV !== 'production' && warn(false, e.message);
      parsedQuery = {};
    }
    for (var key in extraQuery) {
      parsedQuery[key] = extraQuery[key];
    }
    return parsedQuery;
  }

  function parseQuery(query) {
    var res = {};

    query = query.trim().replace(/^(\?|#|&)/, '');

    if (!query) {
      return res;
    }

    query.split('&').forEach(function (param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = decode(parts.shift());
      var val = parts.length > 0 ? decode(parts.join('=')) : null;

      if (res[key] === undefined) {
        res[key] = val;
      } else if (Array.isArray(res[key])) {
        res[key].push(val);
      } else {
        res[key] = [res[key], val];
      }
    });

    return res;
  }

  function stringifyQuery(obj) {
    var res = obj ? Object.keys(obj).map(function (key) {
      var val = obj[key];

      if (val === undefined) {
        return '';
      }

      if (val === null) {
        return encode(key);
      }

      if (Array.isArray(val)) {
        var result = [];
        val.forEach(function (val2) {
          if (val2 === undefined) {
            return;
          }
          if (val2 === null) {
            result.push(encode(key));
          } else {
            result.push(encode(key) + '=' + encode(val2));
          }
        });
        return result.join('&');
      }

      return encode(key) + '=' + encode(val);
    }).filter(function (x) {
      return x.length > 0;
    }).join('&') : null;
    return res ? "?" + res : '';
  }

  /*  */

  var trailingSlashRE = /\/?$/;

  function createRoute(record, location, redirectedFrom, router) {
    var stringifyQuery$$1 = router && router.options.stringifyQuery;

    var query = location.query || {};
    try {
      query = clone(query);
    } catch (e) {}

    var route = {
      name: location.name || record && record.name,
      meta: record && record.meta || {},
      path: location.path || '/',
      hash: location.hash || '',
      query: query,
      params: location.params || {},
      fullPath: getFullPath(location, stringifyQuery$$1),
      matched: record ? formatMatch(record) : []
    };
    if (redirectedFrom) {
      route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery$$1);
    }
    return Object.freeze(route);
  }

  function clone(value) {
    if (Array.isArray(value)) {
      return value.map(clone);
    } else if (value && typeof value === 'object') {
      var res = {};
      for (var key in value) {
        res[key] = clone(value[key]);
      }
      return res;
    } else {
      return value;
    }
  }

  // the starting route that represents the initial state
  var START = createRoute(null, {
    path: '/'
  });

  function formatMatch(record) {
    var res = [];
    while (record) {
      res.unshift(record);
      record = record.parent;
    }
    return res;
  }

  function getFullPath(ref, _stringifyQuery) {
    var path = ref.path;
    var query = ref.query;if (query === void 0) query = {};
    var hash = ref.hash;if (hash === void 0) hash = '';

    var stringify = _stringifyQuery || stringifyQuery;
    return (path || '/') + stringify(query) + hash;
  }

  function isSameRoute(a, b) {
    if (b === START) {
      return a === b;
    } else if (!b) {
      return false;
    } else if (a.path && b.path) {
      return a.path.replace(trailingSlashRE, '') === b.path.replace(trailingSlashRE, '') && a.hash === b.hash && isObjectEqual(a.query, b.query);
    } else if (a.name && b.name) {
      return a.name === b.name && a.hash === b.hash && isObjectEqual(a.query, b.query) && isObjectEqual(a.params, b.params);
    } else {
      return false;
    }
  }

  function isObjectEqual(a, b) {
    if (a === void 0) a = {};
    if (b === void 0) b = {};

    // handle null value #1566
    if (!a || !b) {
      return a === b;
    }
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every(function (key) {
      var aVal = a[key];
      var bVal = b[key];
      // check nested equality
      if (typeof aVal === 'object' && typeof bVal === 'object') {
        return isObjectEqual(aVal, bVal);
      }
      return String(aVal) === String(bVal);
    });
  }

  function isIncludedRoute(current, target) {
    return current.path.replace(trailingSlashRE, '/').indexOf(target.path.replace(trailingSlashRE, '/')) === 0 && (!target.hash || current.hash === target.hash) && queryIncludes(current.query, target.query);
  }

  function queryIncludes(current, target) {
    for (var key in target) {
      if (!(key in current)) {
        return false;
      }
    }
    return true;
  }

  /*  */

  // work around weird flow bug
  var toTypes = [String, Object];
  var eventTypes = [String, Array];

  var Link = {
    name: 'RouterLink',
    props: {
      to: {
        type: toTypes,
        required: true
      },
      tag: {
        type: String,
        default: 'a'
      },
      exact: Boolean,
      append: Boolean,
      replace: Boolean,
      activeClass: String,
      exactActiveClass: String,
      event: {
        type: eventTypes,
        default: 'click'
      }
    },
    render: function render(h) {
      var this$1 = this;

      var router = this.$router;
      var current = this.$route;
      var ref = router.resolve(this.to, current, this.append);
      var location = ref.location;
      var route = ref.route;
      var href = ref.href;

      var classes = {};
      var globalActiveClass = router.options.linkActiveClass;
      var globalExactActiveClass = router.options.linkExactActiveClass;
      // Support global empty active class
      var activeClassFallback = globalActiveClass == null ? 'router-link-active' : globalActiveClass;
      var exactActiveClassFallback = globalExactActiveClass == null ? 'router-link-exact-active' : globalExactActiveClass;
      var activeClass = this.activeClass == null ? activeClassFallback : this.activeClass;
      var exactActiveClass = this.exactActiveClass == null ? exactActiveClassFallback : this.exactActiveClass;
      var compareTarget = location.path ? createRoute(null, location, null, router) : route;

      classes[exactActiveClass] = isSameRoute(current, compareTarget);
      classes[activeClass] = this.exact ? classes[exactActiveClass] : isIncludedRoute(current, compareTarget);

      var handler = function (e) {
        if (guardEvent(e)) {
          if (this$1.replace) {
            router.replace(location);
          } else {
            router.push(location);
          }
        }
      };

      var on = { click: guardEvent };
      if (Array.isArray(this.event)) {
        this.event.forEach(function (e) {
          on[e] = handler;
        });
      } else {
        on[this.event] = handler;
      }

      var data = {
        class: classes
      };

      if (this.tag === 'a') {
        data.on = on;
        data.attrs = { href: href };
      } else {
        // find the first <a> child and apply listener and href
        var a = findAnchor(this.$slots.default);
        if (a) {
          // in case the <a> is a static node
          a.isStatic = false;
          var aData = a.data = extend({}, a.data);
          aData.on = on;
          var aAttrs = a.data.attrs = extend({}, a.data.attrs);
          aAttrs.href = href;
        } else {
          // doesn't have <a> child, apply listener to self
          data.on = on;
        }
      }

      return h(this.tag, data, this.$slots.default);
    }
  };

  function guardEvent(e) {
    // don't redirect with control keys
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    // don't redirect when preventDefault called
    if (e.defaultPrevented) {
      return;
    }
    // don't redirect on right click
    if (e.button !== undefined && e.button !== 0) {
      return;
    }
    // don't redirect if `target="_blank"`
    if (e.currentTarget && e.currentTarget.getAttribute) {
      var target = e.currentTarget.getAttribute('target');
      if (/\b_blank\b/i.test(target)) {
        return;
      }
    }
    // this may be a Weex event which doesn't have this method
    if (e.preventDefault) {
      e.preventDefault();
    }
    return true;
  }

  function findAnchor(children) {
    if (children) {
      var child;
      for (var i = 0; i < children.length; i++) {
        child = children[i];
        if (child.tag === 'a') {
          return child;
        }
        if (child.children && (child = findAnchor(child.children))) {
          return child;
        }
      }
    }
  }

  var _Vue;

  function install(Vue) {
    if (install.installed && _Vue === Vue) {
      return;
    }
    install.installed = true;

    _Vue = Vue;

    var isDef = function (v) {
      return v !== undefined;
    };

    var registerInstance = function (vm, callVal) {
      var i = vm.$options._parentVnode;
      if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
        i(vm, callVal);
      }
    };

    Vue.mixin({
      beforeCreate: function beforeCreate() {
        if (isDef(this.$options.router)) {
          this._routerRoot = this;
          this._router = this.$options.router;
          this._router.init(this);
          Vue.util.defineReactive(this, '_route', this._router.history.current);
        } else {
          this._routerRoot = this.$parent && this.$parent._routerRoot || this;
        }
        registerInstance(this, this);
      },
      destroyed: function destroyed() {
        registerInstance(this);
      }
    });

    Object.defineProperty(Vue.prototype, '$router', {
      get: function get() {
        return this._routerRoot._router;
      }
    });

    Object.defineProperty(Vue.prototype, '$route', {
      get: function get() {
        return this._routerRoot._route;
      }
    });

    Vue.component('RouterView', View);
    Vue.component('RouterLink', Link);

    var strats = Vue.config.optionMergeStrategies;
    // use the same hook merging strategy for route hooks
    strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created;
  }

  /*  */

  var inBrowser = typeof window !== 'undefined';

  /*  */

  function resolvePath(relative, base, append) {
    var firstChar = relative.charAt(0);
    if (firstChar === '/') {
      return relative;
    }

    if (firstChar === '?' || firstChar === '#') {
      return base + relative;
    }

    var stack = base.split('/');

    // remove trailing segment if:
    // - not appending
    // - appending to trailing slash (last segment is empty)
    if (!append || !stack[stack.length - 1]) {
      stack.pop();
    }

    // resolve relative path
    var segments = relative.replace(/^\//, '').split('/');
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (segment === '..') {
        stack.pop();
      } else if (segment !== '.') {
        stack.push(segment);
      }
    }

    // ensure leading slash
    if (stack[0] !== '') {
      stack.unshift('');
    }

    return stack.join('/');
  }

  function parsePath(path) {
    var hash = '';
    var query = '';

    var hashIndex = path.indexOf('#');
    if (hashIndex >= 0) {
      hash = path.slice(hashIndex);
      path = path.slice(0, hashIndex);
    }

    var queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
      query = path.slice(queryIndex + 1);
      path = path.slice(0, queryIndex);
    }

    return {
      path: path,
      query: query,
      hash: hash
    };
  }

  function cleanPath(path) {
    return path.replace(/\/\//g, '/');
  }

  var isarray = Array.isArray || function (arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };

  /**
   * Expose `pathToRegexp`.
   */
  var pathToRegexp_1 = pathToRegexp;
  var parse_1 = parse;
  var compile_1 = compile;
  var tokensToFunction_1 = tokensToFunction;
  var tokensToRegExp_1 = tokensToRegExp;

  /**
   * The main path matching regexp utility.
   *
   * @type {RegExp}
   */
  var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'].join('|'), 'g');

  /**
   * Parse a string for the raw tokens.
   *
   * @param  {string}  str
   * @param  {Object=} options
   * @return {!Array}
   */
  function parse(str, options) {
    var tokens = [];
    var key = 0;
    var index = 0;
    var path = '';
    var defaultDelimiter = options && options.delimiter || '/';
    var res;

    while ((res = PATH_REGEXP.exec(str)) != null) {
      var m = res[0];
      var escaped = res[1];
      var offset = res.index;
      path += str.slice(index, offset);
      index = offset + m.length;

      // Ignore already escaped sequences.
      if (escaped) {
        path += escaped[1];
        continue;
      }

      var next = str[index];
      var prefix = res[2];
      var name = res[3];
      var capture = res[4];
      var group = res[5];
      var modifier = res[6];
      var asterisk = res[7];

      // Push the current path onto the tokens.
      if (path) {
        tokens.push(path);
        path = '';
      }

      var partial = prefix != null && next != null && next !== prefix;
      var repeat = modifier === '+' || modifier === '*';
      var optional = modifier === '?' || modifier === '*';
      var delimiter = res[2] || defaultDelimiter;
      var pattern = capture || group;

      tokens.push({
        name: name || key++,
        prefix: prefix || '',
        delimiter: delimiter,
        optional: optional,
        repeat: repeat,
        partial: partial,
        asterisk: !!asterisk,
        pattern: pattern ? escapeGroup(pattern) : asterisk ? '.*' : '[^' + escapeString(delimiter) + ']+?'
      });
    }

    // Match any characters still remaining.
    if (index < str.length) {
      path += str.substr(index);
    }

    // If the path exists, push it onto the end.
    if (path) {
      tokens.push(path);
    }

    return tokens;
  }

  /**
   * Compile a string to a template function for the path.
   *
   * @param  {string}             str
   * @param  {Object=}            options
   * @return {!function(Object=, Object=)}
   */
  function compile(str, options) {
    return tokensToFunction(parse(str, options));
  }

  /**
   * Prettier encoding of URI path segments.
   *
   * @param  {string}
   * @return {string}
   */
  function encodeURIComponentPretty(str) {
    return encodeURI(str).replace(/[\/?#]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  /**
   * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
   *
   * @param  {string}
   * @return {string}
   */
  function encodeAsterisk(str) {
    return encodeURI(str).replace(/[?#]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase();
    });
  }

  /**
   * Expose a method for transforming tokens into the path function.
   */
  function tokensToFunction(tokens) {
    // Compile all the tokens into regexps.
    var matches = new Array(tokens.length);

    // Compile all the patterns before compilation.
    for (var i = 0; i < tokens.length; i++) {
      if (typeof tokens[i] === 'object') {
        matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
      }
    }

    return function (obj, opts) {
      var path = '';
      var data = obj || {};
      var options = opts || {};
      var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent;

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          path += token;

          continue;
        }

        var value = data[token.name];
        var segment;

        if (value == null) {
          if (token.optional) {
            // Prepend partial segment prefixes.
            if (token.partial) {
              path += token.prefix;
            }

            continue;
          } else {
            throw new TypeError('Expected "' + token.name + '" to be defined');
          }
        }

        if (isarray(value)) {
          if (!token.repeat) {
            throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`');
          }

          if (value.length === 0) {
            if (token.optional) {
              continue;
            } else {
              throw new TypeError('Expected "' + token.name + '" to not be empty');
            }
          }

          for (var j = 0; j < value.length; j++) {
            segment = encode(value[j]);

            if (!matches[i].test(segment)) {
              throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`');
            }

            path += (j === 0 ? token.prefix : token.delimiter) + segment;
          }

          continue;
        }

        segment = token.asterisk ? encodeAsterisk(value) : encode(value);

        if (!matches[i].test(segment)) {
          throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"');
        }

        path += token.prefix + segment;
      }

      return path;
    };
  }

  /**
   * Escape a regular expression string.
   *
   * @param  {string} str
   * @return {string}
   */
  function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1');
  }

  /**
   * Escape the capturing group by escaping special characters and meaning.
   *
   * @param  {string} group
   * @return {string}
   */
  function escapeGroup(group) {
    return group.replace(/([=!:$\/()])/g, '\\$1');
  }

  /**
   * Attach the keys as a property of the regexp.
   *
   * @param  {!RegExp} re
   * @param  {Array}   keys
   * @return {!RegExp}
   */
  function attachKeys(re, keys) {
    re.keys = keys;
    return re;
  }

  /**
   * Get the flags for a regexp from the options.
   *
   * @param  {Object} options
   * @return {string}
   */
  function flags(options) {
    return options.sensitive ? '' : 'i';
  }

  /**
   * Pull out keys from a regexp.
   *
   * @param  {!RegExp} path
   * @param  {!Array}  keys
   * @return {!RegExp}
   */
  function regexpToRegexp(path, keys) {
    // Use a negative lookahead to match only capturing groups.
    var groups = path.source.match(/\((?!\?)/g);

    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        keys.push({
          name: i,
          prefix: null,
          delimiter: null,
          optional: false,
          repeat: false,
          partial: false,
          asterisk: false,
          pattern: null
        });
      }
    }

    return attachKeys(path, keys);
  }

  /**
   * Transform an array into a regexp.
   *
   * @param  {!Array}  path
   * @param  {Array}   keys
   * @param  {!Object} options
   * @return {!RegExp}
   */
  function arrayToRegexp(path, keys, options) {
    var parts = [];

    for (var i = 0; i < path.length; i++) {
      parts.push(pathToRegexp(path[i], keys, options).source);
    }

    var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

    return attachKeys(regexp, keys);
  }

  /**
   * Create a path regexp from string input.
   *
   * @param  {string}  path
   * @param  {!Array}  keys
   * @param  {!Object} options
   * @return {!RegExp}
   */
  function stringToRegexp(path, keys, options) {
    return tokensToRegExp(parse(path, options), keys, options);
  }

  /**
   * Expose a function for taking tokens and returning a RegExp.
   *
   * @param  {!Array}          tokens
   * @param  {(Array|Object)=} keys
   * @param  {Object=}         options
   * @return {!RegExp}
   */
  function tokensToRegExp(tokens, keys, options) {
    if (!isarray(keys)) {
      options = /** @type {!Object} */keys || options;
      keys = [];
    }

    options = options || {};

    var strict = options.strict;
    var end = options.end !== false;
    var route = '';

    // Iterate over the tokens and create our regexp string.
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        route += escapeString(token);
      } else {
        var prefix = escapeString(token.prefix);
        var capture = '(?:' + token.pattern + ')';

        keys.push(token);

        if (token.repeat) {
          capture += '(?:' + prefix + capture + ')*';
        }

        if (token.optional) {
          if (!token.partial) {
            capture = '(?:' + prefix + '(' + capture + '))?';
          } else {
            capture = prefix + '(' + capture + ')?';
          }
        } else {
          capture = prefix + '(' + capture + ')';
        }

        route += capture;
      }
    }

    var delimiter = escapeString(options.delimiter || '/');
    var endsWithDelimiter = route.slice(-delimiter.length) === delimiter;

    // In non-strict mode we allow a slash at the end of match. If the path to
    // match already ends with a slash, we remove it for consistency. The slash
    // is valid at the end of a path match, not in the middle. This is important
    // in non-ending mode, where "/test/" shouldn't match "/test//route".
    if (!strict) {
      route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + '(?:' + delimiter + '(?=$))?';
    }

    if (end) {
      route += '$';
    } else {
      // In non-ending mode, we need the capturing groups to match as much as
      // possible by using a positive lookahead to the end or next path segment.
      route += strict && endsWithDelimiter ? '' : '(?=' + delimiter + '|$)';
    }

    return attachKeys(new RegExp('^' + route, flags(options)), keys);
  }

  /**
   * Normalize the given path string, returning a regular expression.
   *
   * An empty array can be passed in for the keys, which will hold the
   * placeholder key descriptions. For example, using `/user/:id`, `keys` will
   * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
   *
   * @param  {(string|RegExp|Array)} path
   * @param  {(Array|Object)=}       keys
   * @param  {Object=}               options
   * @return {!RegExp}
   */
  function pathToRegexp(path, keys, options) {
    if (!isarray(keys)) {
      options = /** @type {!Object} */keys || options;
      keys = [];
    }

    options = options || {};

    if (path instanceof RegExp) {
      return regexpToRegexp(path, /** @type {!Array} */keys);
    }

    if (isarray(path)) {
      return arrayToRegexp( /** @type {!Array} */path, /** @type {!Array} */keys, options);
    }

    return stringToRegexp( /** @type {string} */path, /** @type {!Array} */keys, options);
  }
  pathToRegexp_1.parse = parse_1;
  pathToRegexp_1.compile = compile_1;
  pathToRegexp_1.tokensToFunction = tokensToFunction_1;
  pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

  /*  */

  // $flow-disable-line
  var regexpCompileCache = Object.create(null);

  function fillParams(path, params, routeMsg) {
    params = params || {};
    try {
      var filler = regexpCompileCache[path] || (regexpCompileCache[path] = pathToRegexp_1.compile(path));

      // Fix #2505 resolving asterisk routes { name: 'not-found', params: { pathMatch: '/not-found' }}
      if (params.pathMatch) {
        params[0] = params.pathMatch;
      }

      return filler(params, { pretty: true });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        warn(false, "missing param for " + routeMsg + ": " + e.message);
      }
      return '';
    } finally {
      // delete the 0 if it was added
      delete params[0];
    }
  }

  /*  */

  function createRouteMap(routes, oldPathList, oldPathMap, oldNameMap) {
    // the path list is used to control path matching priority
    var pathList = oldPathList || [];
    // $flow-disable-line
    var pathMap = oldPathMap || Object.create(null);
    // $flow-disable-line
    var nameMap = oldNameMap || Object.create(null);

    routes.forEach(function (route) {
      addRouteRecord(pathList, pathMap, nameMap, route);
    });

    // ensure wildcard routes are always at the end
    for (var i = 0, l = pathList.length; i < l; i++) {
      if (pathList[i] === '*') {
        pathList.push(pathList.splice(i, 1)[0]);
        l--;
        i--;
      }
    }

    return {
      pathList: pathList,
      pathMap: pathMap,
      nameMap: nameMap
    };
  }

  function addRouteRecord(pathList, pathMap, nameMap, route, parent, matchAs) {
    var path = route.path;
    var name = route.name;
    if (process.env.NODE_ENV !== 'production') {
      assert(path != null, "\"path\" is required in a route configuration.");
      assert(typeof route.component !== 'string', "route config \"component\" for path: " + String(path || name) + " cannot be a " + "string id. Use an actual component instead.");
    }

    var pathToRegexpOptions = route.pathToRegexpOptions || {};
    var normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict);

    if (typeof route.caseSensitive === 'boolean') {
      pathToRegexpOptions.sensitive = route.caseSensitive;
    }

    var record = {
      path: normalizedPath,
      regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
      components: route.components || { default: route.component },
      instances: {},
      name: name,
      parent: parent,
      matchAs: matchAs,
      redirect: route.redirect,
      beforeEnter: route.beforeEnter,
      meta: route.meta || {},
      props: route.props == null ? {} : route.components ? route.props : { default: route.props }
    };

    if (route.children) {
      // Warn if route is named, does not redirect and has a default child route.
      // If users navigate to this route by name, the default child will
      // not be rendered (GH Issue #629)
      if (process.env.NODE_ENV !== 'production') {
        if (route.name && !route.redirect && route.children.some(function (child) {
          return (/^\/?$/.test(child.path)
          );
        })) {
          warn(false, "Named Route '" + route.name + "' has a default child route. " + "When navigating to this named route (:to=\"{name: '" + route.name + "'\"), " + "the default child route will not be rendered. Remove the name from " + "this route and use the name of the default child route for named " + "links instead.");
        }
      }
      route.children.forEach(function (child) {
        var childMatchAs = matchAs ? cleanPath(matchAs + "/" + child.path) : undefined;
        addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs);
      });
    }

    if (route.alias !== undefined) {
      var aliases = Array.isArray(route.alias) ? route.alias : [route.alias];

      aliases.forEach(function (alias) {
        var aliasRoute = {
          path: alias,
          children: route.children
        };
        addRouteRecord(pathList, pathMap, nameMap, aliasRoute, parent, record.path || '/' // matchAs
        );
      });
    }

    if (!pathMap[record.path]) {
      pathList.push(record.path);
      pathMap[record.path] = record;
    }

    if (name) {
      if (!nameMap[name]) {
        nameMap[name] = record;
      } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
        warn(false, "Duplicate named routes definition: " + "{ name: \"" + name + "\", path: \"" + record.path + "\" }");
      }
    }
  }

  function compileRouteRegex(path, pathToRegexpOptions) {
    var regex = pathToRegexp_1(path, [], pathToRegexpOptions);
    if (process.env.NODE_ENV !== 'production') {
      var keys = Object.create(null);
      regex.keys.forEach(function (key) {
        warn(!keys[key.name], "Duplicate param keys in route with path: \"" + path + "\"");
        keys[key.name] = true;
      });
    }
    return regex;
  }

  function normalizePath(path, parent, strict) {
    if (!strict) {
      path = path.replace(/\/$/, '');
    }
    if (path[0] === '/') {
      return path;
    }
    if (parent == null) {
      return path;
    }
    return cleanPath(parent.path + "/" + path);
  }

  /*  */

  function normalizeLocation(raw, current, append, router) {
    var next = typeof raw === 'string' ? { path: raw } : raw;
    // named target
    if (next._normalized) {
      return next;
    } else if (next.name) {
      return extend({}, raw);
    }

    // relative params
    if (!next.path && next.params && current) {
      next = extend({}, next);
      next._normalized = true;
      var params = extend(extend({}, current.params), next.params);
      if (current.name) {
        next.name = current.name;
        next.params = params;
      } else if (current.matched.length) {
        var rawPath = current.matched[current.matched.length - 1].path;
        next.path = fillParams(rawPath, params, "path " + current.path);
      } else if (process.env.NODE_ENV !== 'production') {
        warn(false, "relative params navigation requires a current route.");
      }
      return next;
    }

    var parsedPath = parsePath(next.path || '');
    var basePath = current && current.path || '/';
    var path = parsedPath.path ? resolvePath(parsedPath.path, basePath, append || next.append) : basePath;

    var query = resolveQuery(parsedPath.query, next.query, router && router.options.parseQuery);

    var hash = next.hash || parsedPath.hash;
    if (hash && hash.charAt(0) !== '#') {
      hash = "#" + hash;
    }

    return {
      _normalized: true,
      path: path,
      query: query,
      hash: hash
    };
  }

  /*  */

  function createMatcher(routes, router) {
    var ref = createRouteMap(routes);
    var pathList = ref.pathList;
    var pathMap = ref.pathMap;
    var nameMap = ref.nameMap;

    function addRoutes(routes) {
      createRouteMap(routes, pathList, pathMap, nameMap);
    }

    function match(raw, currentRoute, redirectedFrom) {
      var location = normalizeLocation(raw, currentRoute, false, router);
      var name = location.name;

      if (name) {
        var record = nameMap[name];
        if (process.env.NODE_ENV !== 'production') {
          warn(record, "Route with name '" + name + "' does not exist");
        }
        if (!record) {
          return _createRoute(null, location);
        }
        var paramNames = record.regex.keys.filter(function (key) {
          return !key.optional;
        }).map(function (key) {
          return key.name;
        });

        if (typeof location.params !== 'object') {
          location.params = {};
        }

        if (currentRoute && typeof currentRoute.params === 'object') {
          for (var key in currentRoute.params) {
            if (!(key in location.params) && paramNames.indexOf(key) > -1) {
              location.params[key] = currentRoute.params[key];
            }
          }
        }

        location.path = fillParams(record.path, location.params, "named route \"" + name + "\"");
        return _createRoute(record, location, redirectedFrom);
      } else if (location.path) {
        location.params = {};
        for (var i = 0; i < pathList.length; i++) {
          var path = pathList[i];
          var record$1 = pathMap[path];
          if (matchRoute(record$1.regex, location.path, location.params)) {
            return _createRoute(record$1, location, redirectedFrom);
          }
        }
      }
      // no match
      return _createRoute(null, location);
    }

    function redirect(record, location) {
      var originalRedirect = record.redirect;
      var redirect = typeof originalRedirect === 'function' ? originalRedirect(createRoute(record, location, null, router)) : originalRedirect;

      if (typeof redirect === 'string') {
        redirect = { path: redirect };
      }

      if (!redirect || typeof redirect !== 'object') {
        if (process.env.NODE_ENV !== 'production') {
          warn(false, "invalid redirect option: " + JSON.stringify(redirect));
        }
        return _createRoute(null, location);
      }

      var re = redirect;
      var name = re.name;
      var path = re.path;
      var query = location.query;
      var hash = location.hash;
      var params = location.params;
      query = re.hasOwnProperty('query') ? re.query : query;
      hash = re.hasOwnProperty('hash') ? re.hash : hash;
      params = re.hasOwnProperty('params') ? re.params : params;

      if (name) {
        // resolved named direct
        var targetRecord = nameMap[name];
        if (process.env.NODE_ENV !== 'production') {
          assert(targetRecord, "redirect failed: named route \"" + name + "\" not found.");
        }
        return match({
          _normalized: true,
          name: name,
          query: query,
          hash: hash,
          params: params
        }, undefined, location);
      } else if (path) {
        // 1. resolve relative redirect
        var rawPath = resolveRecordPath(path, record);
        // 2. resolve params
        var resolvedPath = fillParams(rawPath, params, "redirect route with path \"" + rawPath + "\"");
        // 3. rematch with existing query and hash
        return match({
          _normalized: true,
          path: resolvedPath,
          query: query,
          hash: hash
        }, undefined, location);
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn(false, "invalid redirect option: " + JSON.stringify(redirect));
        }
        return _createRoute(null, location);
      }
    }

    function alias(record, location, matchAs) {
      var aliasedPath = fillParams(matchAs, location.params, "aliased route with path \"" + matchAs + "\"");
      var aliasedMatch = match({
        _normalized: true,
        path: aliasedPath
      });
      if (aliasedMatch) {
        var matched = aliasedMatch.matched;
        var aliasedRecord = matched[matched.length - 1];
        location.params = aliasedMatch.params;
        return _createRoute(aliasedRecord, location);
      }
      return _createRoute(null, location);
    }

    function _createRoute(record, location, redirectedFrom) {
      if (record && record.redirect) {
        return redirect(record, redirectedFrom || location);
      }
      if (record && record.matchAs) {
        return alias(record, location, record.matchAs);
      }
      return createRoute(record, location, redirectedFrom, router);
    }

    return {
      match: match,
      addRoutes: addRoutes
    };
  }

  function matchRoute(regex, path, params) {
    var m = path.match(regex);

    if (!m) {
      return false;
    } else if (!params) {
      return true;
    }

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = regex.keys[i - 1];
      var val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
      if (key) {
        // Fix #1994: using * with props: true generates a param named 0
        params[key.name || 'pathMatch'] = val;
      }
    }

    return true;
  }

  function resolveRecordPath(path, record) {
    return resolvePath(path, record.parent ? record.parent.path : '/', true);
  }

  /*  */

  var positionStore = Object.create(null);

  function setupScroll() {
    // Fix for #1585 for Firefox
    // Fix for #2195 Add optional third attribute to workaround a bug in safari https://bugs.webkit.org/show_bug.cgi?id=182678
    // Fix for #2774 Support for apps loaded from Windows file shares not mapped to network drives: replaced location.origin with
    // window.location.protocol + '//' + window.location.host
    // location.host contains the port and location.hostname doesn't
    var protocolAndPath = window.location.protocol + '//' + window.location.host;
    var absolutePath = window.location.href.replace(protocolAndPath, '');
    window.history.replaceState({ key: getStateKey() }, '', absolutePath);
    window.addEventListener('popstate', function (e) {
      saveScrollPosition();
      if (e.state && e.state.key) {
        setStateKey(e.state.key);
      }
    });
  }

  function handleScroll(router, to, from, isPop) {
    if (!router.app) {
      return;
    }

    var behavior = router.options.scrollBehavior;
    if (!behavior) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      assert(typeof behavior === 'function', "scrollBehavior must be a function");
    }

    // wait until re-render finishes before scrolling
    router.app.$nextTick(function () {
      var position = getScrollPosition();
      var shouldScroll = behavior.call(router, to, from, isPop ? position : null);

      if (!shouldScroll) {
        return;
      }

      if (typeof shouldScroll.then === 'function') {
        shouldScroll.then(function (shouldScroll) {
          scrollToPosition(shouldScroll, position);
        }).catch(function (err) {
          if (process.env.NODE_ENV !== 'production') {
            assert(false, err.toString());
          }
        });
      } else {
        scrollToPosition(shouldScroll, position);
      }
    });
  }

  function saveScrollPosition() {
    var key = getStateKey();
    if (key) {
      positionStore[key] = {
        x: window.pageXOffset,
        y: window.pageYOffset
      };
    }
  }

  function getScrollPosition() {
    var key = getStateKey();
    if (key) {
      return positionStore[key];
    }
  }

  function getElementPosition(el, offset) {
    var docEl = document.documentElement;
    var docRect = docEl.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();
    return {
      x: elRect.left - docRect.left - offset.x,
      y: elRect.top - docRect.top - offset.y
    };
  }

  function isValidPosition(obj) {
    return isNumber(obj.x) || isNumber(obj.y);
  }

  function normalizePosition(obj) {
    return {
      x: isNumber(obj.x) ? obj.x : window.pageXOffset,
      y: isNumber(obj.y) ? obj.y : window.pageYOffset
    };
  }

  function normalizeOffset(obj) {
    return {
      x: isNumber(obj.x) ? obj.x : 0,
      y: isNumber(obj.y) ? obj.y : 0
    };
  }

  function isNumber(v) {
    return typeof v === 'number';
  }

  function scrollToPosition(shouldScroll, position) {
    var isObject = typeof shouldScroll === 'object';
    if (isObject && typeof shouldScroll.selector === 'string') {
      var el = document.querySelector(shouldScroll.selector);
      if (el) {
        var offset = shouldScroll.offset && typeof shouldScroll.offset === 'object' ? shouldScroll.offset : {};
        offset = normalizeOffset(offset);
        position = getElementPosition(el, offset);
      } else if (isValidPosition(shouldScroll)) {
        position = normalizePosition(shouldScroll);
      }
    } else if (isObject && isValidPosition(shouldScroll)) {
      position = normalizePosition(shouldScroll);
    }

    if (position) {
      window.scrollTo(position.x, position.y);
    }
  }

  /*  */

  var supportsPushState = inBrowser && function () {
    var ua = window.navigator.userAgent;

    if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) && ua.indexOf('Mobile Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Windows Phone') === -1) {
      return false;
    }

    return window.history && 'pushState' in window.history;
  }();

  // use User Timing api (if present) for more accurate key precision
  var Time = inBrowser && window.performance && window.performance.now ? window.performance : Date;

  var _key = genKey();

  function genKey() {
    return Time.now().toFixed(3);
  }

  function getStateKey() {
    return _key;
  }

  function setStateKey(key) {
    _key = key;
  }

  function pushState(url, replace) {
    saveScrollPosition();
    // try...catch the pushState call to get around Safari
    // DOM Exception 18 where it limits to 100 pushState calls
    var history = window.history;
    try {
      if (replace) {
        history.replaceState({ key: _key }, '', url);
      } else {
        _key = genKey();
        history.pushState({ key: _key }, '', url);
      }
    } catch (e) {
      window.location[replace ? 'replace' : 'assign'](url);
    }
  }

  function replaceState(url) {
    pushState(url, true);
  }

  /*  */

  function runQueue(queue, fn, cb) {
    var step = function (index) {
      if (index >= queue.length) {
        cb();
      } else {
        if (queue[index]) {
          fn(queue[index], function () {
            step(index + 1);
          });
        } else {
          step(index + 1);
        }
      }
    };
    step(0);
  }

  /*  */

  function resolveAsyncComponents(matched) {
    return function (to, from, next) {
      var hasAsync = false;
      var pending = 0;
      var error = null;

      flatMapComponents(matched, function (def, _, match, key) {
        // if it's a function and doesn't have cid attached,
        // assume it's an async component resolve function.
        // we are not using Vue's default async resolving mechanism because
        // we want to halt the navigation until the incoming component has been
        // resolved.
        if (typeof def === 'function' && def.cid === undefined) {
          hasAsync = true;
          pending++;

          var resolve = once(function (resolvedDef) {
            if (isESModule(resolvedDef)) {
              resolvedDef = resolvedDef.default;
            }
            // save resolved on async factory in case it's used elsewhere
            def.resolved = typeof resolvedDef === 'function' ? resolvedDef : _Vue.extend(resolvedDef);
            match.components[key] = resolvedDef;
            pending--;
            if (pending <= 0) {
              next();
            }
          });

          var reject = once(function (reason) {
            var msg = "Failed to resolve async component " + key + ": " + reason;
            process.env.NODE_ENV !== 'production' && warn(false, msg);
            if (!error) {
              error = isError(reason) ? reason : new Error(msg);
              next(error);
            }
          });

          var res;
          try {
            res = def(resolve, reject);
          } catch (e) {
            reject(e);
          }
          if (res) {
            if (typeof res.then === 'function') {
              res.then(resolve, reject);
            } else {
              // new syntax in Vue 2.3
              var comp = res.component;
              if (comp && typeof comp.then === 'function') {
                comp.then(resolve, reject);
              }
            }
          }
        }
      });

      if (!hasAsync) {
        next();
      }
    };
  }

  function flatMapComponents(matched, fn) {
    return flatten(matched.map(function (m) {
      return Object.keys(m.components).map(function (key) {
        return fn(m.components[key], m.instances[key], m, key);
      });
    }));
  }

  function flatten(arr) {
    return Array.prototype.concat.apply([], arr);
  }

  var hasSymbol = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

  function isESModule(obj) {
    return obj.__esModule || hasSymbol && obj[Symbol.toStringTag] === 'Module';
  }

  // in Webpack 2, require.ensure now also returns a Promise
  // so the resolve/reject functions may get called an extra time
  // if the user uses an arrow function shorthand that happens to
  // return that Promise.
  function once(fn) {
    var called = false;
    return function () {
      var args = [],
          len = arguments.length;
      while (len--) args[len] = arguments[len];

      if (called) {
        return;
      }
      called = true;
      return fn.apply(this, args);
    };
  }

  /*  */

  var History = function History(router, base) {
    this.router = router;
    this.base = normalizeBase(base);
    // start with a route object that stands for "nowhere"
    this.current = START;
    this.pending = null;
    this.ready = false;
    this.readyCbs = [];
    this.readyErrorCbs = [];
    this.errorCbs = [];
  };

  History.prototype.listen = function listen(cb) {
    this.cb = cb;
  };

  History.prototype.onReady = function onReady(cb, errorCb) {
    if (this.ready) {
      cb();
    } else {
      this.readyCbs.push(cb);
      if (errorCb) {
        this.readyErrorCbs.push(errorCb);
      }
    }
  };

  History.prototype.onError = function onError(errorCb) {
    this.errorCbs.push(errorCb);
  };

  History.prototype.transitionTo = function transitionTo(location, onComplete, onAbort) {
    var this$1 = this;

    var route = this.router.match(location, this.current);
    this.confirmTransition(route, function () {
      this$1.updateRoute(route);
      onComplete && onComplete(route);
      this$1.ensureURL();

      // fire ready cbs once
      if (!this$1.ready) {
        this$1.ready = true;
        this$1.readyCbs.forEach(function (cb) {
          cb(route);
        });
      }
    }, function (err) {
      if (onAbort) {
        onAbort(err);
      }
      if (err && !this$1.ready) {
        this$1.ready = true;
        this$1.readyErrorCbs.forEach(function (cb) {
          cb(err);
        });
      }
    });
  };

  History.prototype.confirmTransition = function confirmTransition(route, onComplete, onAbort) {
    var this$1 = this;

    var current = this.current;
    var abort = function (err) {
      if (isError(err)) {
        if (this$1.errorCbs.length) {
          this$1.errorCbs.forEach(function (cb) {
            cb(err);
          });
        } else {
          warn(false, 'uncaught error during route navigation:');
          console.error(err);
        }
      }
      onAbort && onAbort(err);
    };
    if (isSameRoute(route, current) &&
    // in the case the route map has been dynamically appended to
    route.matched.length === current.matched.length) {
      this.ensureURL();
      return abort();
    }

    var ref = resolveQueue(this.current.matched, route.matched);
    var updated = ref.updated;
    var deactivated = ref.deactivated;
    var activated = ref.activated;

    var queue = [].concat(
    // in-component leave guards
    extractLeaveGuards(deactivated),
    // global before hooks
    this.router.beforeHooks,
    // in-component update hooks
    extractUpdateHooks(updated),
    // in-config enter guards
    activated.map(function (m) {
      return m.beforeEnter;
    }),
    // async components
    resolveAsyncComponents(activated));

    this.pending = route;
    var iterator = function (hook, next) {
      if (this$1.pending !== route) {
        return abort();
      }
      try {
        hook(route, current, function (to) {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this$1.ensureURL(true);
            abort(to);
          } else if (typeof to === 'string' || typeof to === 'object' && (typeof to.path === 'string' || typeof to.name === 'string')) {
            // next('/') or next({ path: '/' }) -> redirect
            abort();
            if (typeof to === 'object' && to.replace) {
              this$1.replace(to);
            } else {
              this$1.push(to);
            }
          } else {
            // confirm transition and pass on the value
            next(to);
          }
        });
      } catch (e) {
        abort(e);
      }
    };

    runQueue(queue, iterator, function () {
      var postEnterCbs = [];
      var isValid = function () {
        return this$1.current === route;
      };
      // wait until async components are resolved before
      // extracting in-component enter guards
      var enterGuards = extractEnterGuards(activated, postEnterCbs, isValid);
      var queue = enterGuards.concat(this$1.router.resolveHooks);
      runQueue(queue, iterator, function () {
        if (this$1.pending !== route) {
          return abort();
        }
        this$1.pending = null;
        onComplete(route);
        if (this$1.router.app) {
          this$1.router.app.$nextTick(function () {
            postEnterCbs.forEach(function (cb) {
              cb();
            });
          });
        }
      });
    });
  };

  History.prototype.updateRoute = function updateRoute(route) {
    var prev = this.current;
    this.current = route;
    this.cb && this.cb(route);
    this.router.afterHooks.forEach(function (hook) {
      hook && hook(route, prev);
    });
  };

  function normalizeBase(base) {
    if (!base) {
      if (inBrowser) {
        // respect <base> tag
        var baseEl = document.querySelector('base');
        base = baseEl && baseEl.getAttribute('href') || '/';
        // strip full URL origin
        base = base.replace(/^https?:\/\/[^\/]+/, '');
      } else {
        base = '/';
      }
    }
    // make sure there's the starting slash
    if (base.charAt(0) !== '/') {
      base = '/' + base;
    }
    // remove trailing slash
    return base.replace(/\/$/, '');
  }

  function resolveQueue(current, next) {
    var i;
    var max = Math.max(current.length, next.length);
    for (i = 0; i < max; i++) {
      if (current[i] !== next[i]) {
        break;
      }
    }
    return {
      updated: next.slice(0, i),
      activated: next.slice(i),
      deactivated: current.slice(i)
    };
  }

  function extractGuards(records, name, bind, reverse) {
    var guards = flatMapComponents(records, function (def, instance, match, key) {
      var guard = extractGuard(def, name);
      if (guard) {
        return Array.isArray(guard) ? guard.map(function (guard) {
          return bind(guard, instance, match, key);
        }) : bind(guard, instance, match, key);
      }
    });
    return flatten(reverse ? guards.reverse() : guards);
  }

  function extractGuard(def, key) {
    if (typeof def !== 'function') {
      // extend now so that global mixins are applied.
      def = _Vue.extend(def);
    }
    return def.options[key];
  }

  function extractLeaveGuards(deactivated) {
    return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true);
  }

  function extractUpdateHooks(updated) {
    return extractGuards(updated, 'beforeRouteUpdate', bindGuard);
  }

  function bindGuard(guard, instance) {
    if (instance) {
      return function boundRouteGuard() {
        return guard.apply(instance, arguments);
      };
    }
  }

  function extractEnterGuards(activated, cbs, isValid) {
    return extractGuards(activated, 'beforeRouteEnter', function (guard, _, match, key) {
      return bindEnterGuard(guard, match, key, cbs, isValid);
    });
  }

  function bindEnterGuard(guard, match, key, cbs, isValid) {
    return function routeEnterGuard(to, from, next) {
      return guard(to, from, function (cb) {
        if (typeof cb === 'function') {
          cbs.push(function () {
            // #750
            // if a router-view is wrapped with an out-in transition,
            // the instance may not have been registered at this time.
            // we will need to poll for registration until current route
            // is no longer valid.
            poll(cb, match.instances, key, isValid);
          });
        }
        next(cb);
      });
    };
  }

  function poll(cb, // somehow flow cannot infer this is a function
  instances, key, isValid) {
    if (instances[key] && !instances[key]._isBeingDestroyed // do not reuse being destroyed instance
    ) {
        cb(instances[key]);
      } else if (isValid()) {
      setTimeout(function () {
        poll(cb, instances, key, isValid);
      }, 16);
    }
  }

  /*  */

  var HTML5History = /*@__PURE__*/function (History$$1) {
    function HTML5History(router, base) {
      var this$1 = this;

      History$$1.call(this, router, base);

      var expectScroll = router.options.scrollBehavior;
      var supportsScroll = supportsPushState && expectScroll;

      if (supportsScroll) {
        setupScroll();
      }

      var initLocation = getLocation(this.base);
      window.addEventListener('popstate', function (e) {
        var current = this$1.current;

        // Avoiding first `popstate` event dispatched in some browsers but first
        // history route not updated since async guard at the same time.
        var location = getLocation(this$1.base);
        if (this$1.current === START && location === initLocation) {
          return;
        }

        this$1.transitionTo(location, function (route) {
          if (supportsScroll) {
            handleScroll(router, route, current, true);
          }
        });
      });
    }

    if (History$$1) HTML5History.__proto__ = History$$1;
    HTML5History.prototype = Object.create(History$$1 && History$$1.prototype);
    HTML5History.prototype.constructor = HTML5History;

    HTML5History.prototype.go = function go(n) {
      window.history.go(n);
    };

    HTML5History.prototype.push = function push(location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        pushState(cleanPath(this$1.base + route.fullPath));
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HTML5History.prototype.replace = function replace(location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        replaceState(cleanPath(this$1.base + route.fullPath));
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HTML5History.prototype.ensureURL = function ensureURL(push) {
      if (getLocation(this.base) !== this.current.fullPath) {
        var current = cleanPath(this.base + this.current.fullPath);
        push ? pushState(current) : replaceState(current);
      }
    };

    HTML5History.prototype.getCurrentLocation = function getCurrentLocation() {
      return getLocation(this.base);
    };

    return HTML5History;
  }(History);

  function getLocation(base) {
    var path = decodeURI(window.location.pathname);
    if (base && path.indexOf(base) === 0) {
      path = path.slice(base.length);
    }
    return (path || '/') + window.location.search + window.location.hash;
  }

  /*  */

  var HashHistory = /*@__PURE__*/function (History$$1) {
    function HashHistory(router, base, fallback) {
      History$$1.call(this, router, base);
      // check history fallback deeplinking
      if (fallback && checkFallback(this.base)) {
        return;
      }
      ensureSlash();
    }

    if (History$$1) HashHistory.__proto__ = History$$1;
    HashHistory.prototype = Object.create(History$$1 && History$$1.prototype);
    HashHistory.prototype.constructor = HashHistory;

    // this is delayed until the app mounts
    // to avoid the hashchange listener being fired too early
    HashHistory.prototype.setupListeners = function setupListeners() {
      var this$1 = this;

      var router = this.router;
      var expectScroll = router.options.scrollBehavior;
      var supportsScroll = supportsPushState && expectScroll;

      if (supportsScroll) {
        setupScroll();
      }

      window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', function () {
        var current = this$1.current;
        if (!ensureSlash()) {
          return;
        }
        this$1.transitionTo(getHash(), function (route) {
          if (supportsScroll) {
            handleScroll(this$1.router, route, current, true);
          }
          if (!supportsPushState) {
            replaceHash(route.fullPath);
          }
        });
      });
    };

    HashHistory.prototype.push = function push(location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        pushHash(route.fullPath);
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HashHistory.prototype.replace = function replace(location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        replaceHash(route.fullPath);
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HashHistory.prototype.go = function go(n) {
      window.history.go(n);
    };

    HashHistory.prototype.ensureURL = function ensureURL(push) {
      var current = this.current.fullPath;
      if (getHash() !== current) {
        push ? pushHash(current) : replaceHash(current);
      }
    };

    HashHistory.prototype.getCurrentLocation = function getCurrentLocation() {
      return getHash();
    };

    return HashHistory;
  }(History);

  function checkFallback(base) {
    var location = getLocation(base);
    if (!/^\/#/.test(location)) {
      window.location.replace(cleanPath(base + '/#' + location));
      return true;
    }
  }

  function ensureSlash() {
    var path = getHash();
    if (path.charAt(0) === '/') {
      return true;
    }
    replaceHash('/' + path);
    return false;
  }

  function getHash() {
    // We can't use window.location.hash here because it's not
    // consistent across browsers - Firefox will pre-decode it!
    var href = window.location.href;
    var index = href.indexOf('#');
    // empty path
    if (index < 0) {
      return '';
    }

    href = href.slice(index + 1);
    // decode the hash but not the search or hash
    // as search(query) is already decoded
    // https://github.com/vuejs/vue-router/issues/2708
    var searchIndex = href.indexOf('?');
    if (searchIndex < 0) {
      var hashIndex = href.indexOf('#');
      if (hashIndex > -1) {
        href = decodeURI(href.slice(0, hashIndex)) + href.slice(hashIndex);
      } else {
        href = decodeURI(href);
      }
    } else {
      if (searchIndex > -1) {
        href = decodeURI(href.slice(0, searchIndex)) + href.slice(searchIndex);
      }
    }

    return href;
  }

  function getUrl(path) {
    var href = window.location.href;
    var i = href.indexOf('#');
    var base = i >= 0 ? href.slice(0, i) : href;
    return base + "#" + path;
  }

  function pushHash(path) {
    if (supportsPushState) {
      pushState(getUrl(path));
    } else {
      window.location.hash = path;
    }
  }

  function replaceHash(path) {
    if (supportsPushState) {
      replaceState(getUrl(path));
    } else {
      window.location.replace(getUrl(path));
    }
  }

  /*  */

  var AbstractHistory = /*@__PURE__*/function (History$$1) {
    function AbstractHistory(router, base) {
      History$$1.call(this, router, base);
      this.stack = [];
      this.index = -1;
    }

    if (History$$1) AbstractHistory.__proto__ = History$$1;
    AbstractHistory.prototype = Object.create(History$$1 && History$$1.prototype);
    AbstractHistory.prototype.constructor = AbstractHistory;

    AbstractHistory.prototype.push = function push(location, onComplete, onAbort) {
      var this$1 = this;

      this.transitionTo(location, function (route) {
        this$1.stack = this$1.stack.slice(0, this$1.index + 1).concat(route);
        this$1.index++;
        onComplete && onComplete(route);
      }, onAbort);
    };

    AbstractHistory.prototype.replace = function replace(location, onComplete, onAbort) {
      var this$1 = this;

      this.transitionTo(location, function (route) {
        this$1.stack = this$1.stack.slice(0, this$1.index).concat(route);
        onComplete && onComplete(route);
      }, onAbort);
    };

    AbstractHistory.prototype.go = function go(n) {
      var this$1 = this;

      var targetIndex = this.index + n;
      if (targetIndex < 0 || targetIndex >= this.stack.length) {
        return;
      }
      var route = this.stack[targetIndex];
      this.confirmTransition(route, function () {
        this$1.index = targetIndex;
        this$1.updateRoute(route);
      });
    };

    AbstractHistory.prototype.getCurrentLocation = function getCurrentLocation() {
      var current = this.stack[this.stack.length - 1];
      return current ? current.fullPath : '/';
    };

    AbstractHistory.prototype.ensureURL = function ensureURL() {
      // noop
    };

    return AbstractHistory;
  }(History);

  /*  */

  var VueRouter = function VueRouter(options) {
    if (options === void 0) options = {};

    this.app = null;
    this.apps = [];
    this.options = options;
    this.beforeHooks = [];
    this.resolveHooks = [];
    this.afterHooks = [];
    this.matcher = createMatcher(options.routes || [], this);

    var mode = options.mode || 'hash';
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false;
    if (this.fallback) {
      mode = 'hash';
    }
    if (!inBrowser) {
      mode = 'abstract';
    }
    this.mode = mode;

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base);
        break;
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback);
        break;
      case 'abstract':
        this.history = new AbstractHistory(this, options.base);
        break;
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, "invalid mode: " + mode);
        }
    }
  };

  var prototypeAccessors = { currentRoute: { configurable: true } };

  VueRouter.prototype.match = function match(raw, current, redirectedFrom) {
    return this.matcher.match(raw, current, redirectedFrom);
  };

  prototypeAccessors.currentRoute.get = function () {
    return this.history && this.history.current;
  };

  VueRouter.prototype.init = function init(app /* Vue component instance */) {
    var this$1 = this;

    process.env.NODE_ENV !== 'production' && assert(install.installed, "not installed. Make sure to call `Vue.use(VueRouter)` " + "before creating root instance.");

    this.apps.push(app);

    // set up app destroyed handler
    // https://github.com/vuejs/vue-router/issues/2639
    app.$once('hook:destroyed', function () {
      // clean out app from this.apps array once destroyed
      var index = this$1.apps.indexOf(app);
      if (index > -1) {
        this$1.apps.splice(index, 1);
      }
      // ensure we still have a main app or null if no apps
      // we do not release the router so it can be reused
      if (this$1.app === app) {
        this$1.app = this$1.apps[0] || null;
      }
    });

    // main app previously initialized
    // return as we don't need to set up new history listener
    if (this.app) {
      return;
    }

    this.app = app;

    var history = this.history;

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation());
    } else if (history instanceof HashHistory) {
      var setupHashListener = function () {
        history.setupListeners();
      };
      history.transitionTo(history.getCurrentLocation(), setupHashListener, setupHashListener);
    }

    history.listen(function (route) {
      this$1.apps.forEach(function (app) {
        app._route = route;
      });
    });
  };

  VueRouter.prototype.beforeEach = function beforeEach(fn) {
    return registerHook(this.beforeHooks, fn);
  };

  VueRouter.prototype.beforeResolve = function beforeResolve(fn) {
    return registerHook(this.resolveHooks, fn);
  };

  VueRouter.prototype.afterEach = function afterEach(fn) {
    return registerHook(this.afterHooks, fn);
  };

  VueRouter.prototype.onReady = function onReady(cb, errorCb) {
    this.history.onReady(cb, errorCb);
  };

  VueRouter.prototype.onError = function onError(errorCb) {
    this.history.onError(errorCb);
  };

  VueRouter.prototype.push = function push(location, onComplete, onAbort) {
    this.history.push(location, onComplete, onAbort);
  };

  VueRouter.prototype.replace = function replace(location, onComplete, onAbort) {
    this.history.replace(location, onComplete, onAbort);
  };

  VueRouter.prototype.go = function go(n) {
    this.history.go(n);
  };

  VueRouter.prototype.back = function back() {
    this.go(-1);
  };

  VueRouter.prototype.forward = function forward() {
    this.go(1);
  };

  VueRouter.prototype.getMatchedComponents = function getMatchedComponents(to) {
    var route = to ? to.matched ? to : this.resolve(to).route : this.currentRoute;
    if (!route) {
      return [];
    }
    return [].concat.apply([], route.matched.map(function (m) {
      return Object.keys(m.components).map(function (key) {
        return m.components[key];
      });
    }));
  };

  VueRouter.prototype.resolve = function resolve(to, current, append) {
    current = current || this.history.current;
    var location = normalizeLocation(to, current, append, this);
    var route = this.match(location, current);
    var fullPath = route.redirectedFrom || route.fullPath;
    var base = this.history.base;
    var href = createHref(base, fullPath, this.mode);
    return {
      location: location,
      route: route,
      href: href,
      // for backwards compat
      normalizedTo: location,
      resolved: route
    };
  };

  VueRouter.prototype.addRoutes = function addRoutes(routes) {
    this.matcher.addRoutes(routes);
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation());
    }
  };

  Object.defineProperties(VueRouter.prototype, prototypeAccessors);

  function registerHook(list, fn) {
    list.push(fn);
    return function () {
      var i = list.indexOf(fn);
      if (i > -1) {
        list.splice(i, 1);
      }
    };
  }

  function createHref(base, fullPath, mode) {
    var path = mode === 'hash' ? '#' + fullPath : fullPath;
    return base ? cleanPath(base + '/' + path) : path;
  }

  VueRouter.install = install;
  VueRouter.version = '3.0.7';

  if (inBrowser && window.Vue) {
    window.Vue.use(VueRouter);
  }

  let routes = [];
  let isGet = false;
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
    return new VueRouter({
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
    routes = [...routes, ...router.options.routes];
    const indexRoute = getIndexRoute(routes);
    let matched = router.currentRoute.matched.filter(item => item.name);
    const first = matched[0];
    if (first && !first.indexRouter) {
      router.breadcrumbs = [indexRoute, ...matched];
    } else {
      router.breadcrumbs = [...matched];
    }
  }

  // 获取首页路由
  function getIndexRoute(routes) {
    let indexRoute = routes.find(route => route.indexRouter);
    if (indexRoute.children) {
      delete indexRoute.children;
    }
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
      if (!isGet) {
        getRoutes(options.modules); // 获取模块的router.js
        /**
         * 过滤模块的路由配置，通常用于权限控制
         */
        if (options.filter) {
          routes = options.filter(routes);
        }
        router.addRoutes(routes);
        isGet = true;
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

  VueRouterDespense.install = VueRouter.install;

  let getters = {};
  let modules = {};

  function autoVuex(options) {
    options.files.keys().forEach(key => {
      // 如果是getters.js
      if (key.startsWith('./getters.js')) {
        getters = options.files(key).default;
        return;
      }
      let path = key.slice(2, -3);
      const storeModule = options.files(key).default;

      modules[path] = storeModule;
    });

    options.pages.keys().forEach(key => {
      let path = key.slice(2, -3);

      if (path === 'model') {
        path = 'pages';
      } else if (path.indexOf('model') !== -1) {
        path = path.slice(0, path.indexOf('model') - 1);
      }
      const storeModule = options.pages(key).default;

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

  /*!
   * vue-i18n v8.12.0
   * (c) 2019 kazuya kawaguchi
   * Released under the MIT License.
   */
  /*  */

  /**
   * constants
   */

  var numberFormatKeys = ['style', 'currency', 'currencyDisplay', 'useGrouping', 'minimumIntegerDigits', 'minimumFractionDigits', 'maximumFractionDigits', 'minimumSignificantDigits', 'maximumSignificantDigits', 'localeMatcher', 'formatMatcher'];

  /**
   * utilities
   */

  function warn$1(msg, err) {
    if (typeof console !== 'undefined') {
      console.warn('[vue-i18n] ' + msg);
      /* istanbul ignore if */
      if (err) {
        console.warn(err.stack);
      }
    }
  }

  function error(msg, err) {
    if (typeof console !== 'undefined') {
      console.error('[vue-i18n] ' + msg);
      /* istanbul ignore if */
      if (err) {
        console.error(err.stack);
      }
    }
  }

  function isObject(obj) {
    return obj !== null && typeof obj === 'object';
  }

  var toString = Object.prototype.toString;
  var OBJECT_STRING = '[object Object]';
  function isPlainObject(obj) {
    return toString.call(obj) === OBJECT_STRING;
  }

  function isNull(val) {
    return val === null || val === undefined;
  }

  function parseArgs() {
    var args = [],
        len = arguments.length;
    while (len--) args[len] = arguments[len];

    var locale = null;
    var params = null;
    if (args.length === 1) {
      if (isObject(args[0]) || Array.isArray(args[0])) {
        params = args[0];
      } else if (typeof args[0] === 'string') {
        locale = args[0];
      }
    } else if (args.length === 2) {
      if (typeof args[0] === 'string') {
        locale = args[0];
      }
      /* istanbul ignore if */
      if (isObject(args[1]) || Array.isArray(args[1])) {
        params = args[1];
      }
    }

    return { locale: locale, params: params };
  }

  function looseClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function remove(arr, item) {
    if (arr.length) {
      var index = arr.indexOf(item);
      if (index > -1) {
        return arr.splice(index, 1);
      }
    }
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key);
  }

  function merge(target) {
    var arguments$1 = arguments;

    var output = Object(target);
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments$1[i];
      if (source !== undefined && source !== null) {
        var key = void 0;
        for (key in source) {
          if (hasOwn(source, key)) {
            if (isObject(source[key])) {
              output[key] = merge(output[key], source[key]);
            } else {
              output[key] = source[key];
            }
          }
        }
      }
    }
    return output;
  }

  function looseEqual(a, b) {
    if (a === b) {
      return true;
    }
    var isObjectA = isObject(a);
    var isObjectB = isObject(b);
    if (isObjectA && isObjectB) {
      try {
        var isArrayA = Array.isArray(a);
        var isArrayB = Array.isArray(b);
        if (isArrayA && isArrayB) {
          return a.length === b.length && a.every(function (e, i) {
            return looseEqual(e, b[i]);
          });
        } else if (!isArrayA && !isArrayB) {
          var keysA = Object.keys(a);
          var keysB = Object.keys(b);
          return keysA.length === keysB.length && keysA.every(function (key) {
            return looseEqual(a[key], b[key]);
          });
        } else {
          /* istanbul ignore next */
          return false;
        }
      } catch (e) {
        /* istanbul ignore next */
        return false;
      }
    } else if (!isObjectA && !isObjectB) {
      return String(a) === String(b);
    } else {
      return false;
    }
  }

  /*  */

  function extend$1(Vue) {
    if (!Vue.prototype.hasOwnProperty('$i18n')) {
      // $FlowFixMe
      Object.defineProperty(Vue.prototype, '$i18n', {
        get: function get() {
          return this._i18n;
        }
      });
    }

    Vue.prototype.$t = function (key) {
      var values = [],
          len = arguments.length - 1;
      while (len-- > 0) values[len] = arguments[len + 1];

      var i18n = this.$i18n;
      return i18n._t.apply(i18n, [key, i18n.locale, i18n._getMessages(), this].concat(values));
    };

    Vue.prototype.$tc = function (key, choice) {
      var values = [],
          len = arguments.length - 2;
      while (len-- > 0) values[len] = arguments[len + 2];

      var i18n = this.$i18n;
      return i18n._tc.apply(i18n, [key, i18n.locale, i18n._getMessages(), this, choice].concat(values));
    };

    Vue.prototype.$te = function (key, locale) {
      var i18n = this.$i18n;
      return i18n._te(key, i18n.locale, i18n._getMessages(), locale);
    };

    Vue.prototype.$d = function (value) {
      var ref;

      var args = [],
          len = arguments.length - 1;
      while (len-- > 0) args[len] = arguments[len + 1];
      return (ref = this.$i18n).d.apply(ref, [value].concat(args));
    };

    Vue.prototype.$n = function (value) {
      var ref;

      var args = [],
          len = arguments.length - 1;
      while (len-- > 0) args[len] = arguments[len + 1];
      return (ref = this.$i18n).n.apply(ref, [value].concat(args));
    };
  }

  /*  */

  var mixin = {
    beforeCreate: function beforeCreate() {
      var options = this.$options;
      options.i18n = options.i18n || (options.__i18n ? {} : null);

      if (options.i18n) {
        if (options.i18n instanceof VueI18n) {
          // init locale messages via custom blocks
          if (options.__i18n) {
            try {
              var localeMessages = {};
              options.__i18n.forEach(function (resource) {
                localeMessages = merge(localeMessages, JSON.parse(resource));
              });
              Object.keys(localeMessages).forEach(function (locale) {
                options.i18n.mergeLocaleMessage(locale, localeMessages[locale]);
              });
            } catch (e) {
              if (process.env.NODE_ENV !== 'production') {
                warn$1("Cannot parse locale messages via custom blocks.", e);
              }
            }
          }
          this._i18n = options.i18n;
          this._i18nWatcher = this._i18n.watchI18nData();
        } else if (isPlainObject(options.i18n)) {
          // component local i18n
          if (this.$root && this.$root.$i18n && this.$root.$i18n instanceof VueI18n) {
            options.i18n.root = this.$root;
            options.i18n.formatter = this.$root.$i18n.formatter;
            options.i18n.fallbackLocale = this.$root.$i18n.fallbackLocale;
            options.i18n.silentTranslationWarn = this.$root.$i18n.silentTranslationWarn;
            options.i18n.silentFallbackWarn = this.$root.$i18n.silentFallbackWarn;
            options.i18n.pluralizationRules = this.$root.$i18n.pluralizationRules;
            options.i18n.preserveDirectiveContent = this.$root.$i18n.preserveDirectiveContent;
          }

          // init locale messages via custom blocks
          if (options.__i18n) {
            try {
              var localeMessages$1 = {};
              options.__i18n.forEach(function (resource) {
                localeMessages$1 = merge(localeMessages$1, JSON.parse(resource));
              });
              options.i18n.messages = localeMessages$1;
            } catch (e) {
              if (process.env.NODE_ENV !== 'production') {
                warn$1("Cannot parse locale messages via custom blocks.", e);
              }
            }
          }

          var ref = options.i18n;
          var sharedMessages = ref.sharedMessages;
          if (sharedMessages && isPlainObject(sharedMessages)) {
            options.i18n.messages = merge(options.i18n.messages, sharedMessages);
          }

          this._i18n = new VueI18n(options.i18n);
          this._i18nWatcher = this._i18n.watchI18nData();

          if (options.i18n.sync === undefined || !!options.i18n.sync) {
            this._localeWatcher = this.$i18n.watchLocale();
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn$1("Cannot be interpreted 'i18n' option.");
          }
        }
      } else if (this.$root && this.$root.$i18n && this.$root.$i18n instanceof VueI18n) {
        // root i18n
        this._i18n = this.$root.$i18n;
      } else if (options.parent && options.parent.$i18n && options.parent.$i18n instanceof VueI18n) {
        // parent i18n
        this._i18n = options.parent.$i18n;
      }
    },

    beforeMount: function beforeMount() {
      var options = this.$options;
      options.i18n = options.i18n || (options.__i18n ? {} : null);

      if (options.i18n) {
        if (options.i18n instanceof VueI18n) {
          // init locale messages via custom blocks
          this._i18n.subscribeDataChanging(this);
          this._subscribing = true;
        } else if (isPlainObject(options.i18n)) {
          this._i18n.subscribeDataChanging(this);
          this._subscribing = true;
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn$1("Cannot be interpreted 'i18n' option.");
          }
        }
      } else if (this.$root && this.$root.$i18n && this.$root.$i18n instanceof VueI18n) {
        this._i18n.subscribeDataChanging(this);
        this._subscribing = true;
      } else if (options.parent && options.parent.$i18n && options.parent.$i18n instanceof VueI18n) {
        this._i18n.subscribeDataChanging(this);
        this._subscribing = true;
      }
    },

    beforeDestroy: function beforeDestroy() {
      if (!this._i18n) {
        return;
      }

      var self = this;
      this.$nextTick(function () {
        if (self._subscribing) {
          self._i18n.unsubscribeDataChanging(self);
          delete self._subscribing;
        }

        if (self._i18nWatcher) {
          self._i18nWatcher();
          self._i18n.destroyVM();
          delete self._i18nWatcher;
        }

        if (self._localeWatcher) {
          self._localeWatcher();
          delete self._localeWatcher;
        }

        self._i18n = null;
      });
    }
  };

  /*  */

  var interpolationComponent = {
    name: 'i18n',
    functional: true,
    props: {
      tag: {
        type: String,
        default: 'span'
      },
      path: {
        type: String,
        required: true
      },
      locale: {
        type: String
      },
      places: {
        type: [Array, Object]
      }
    },
    render: function render(h, ref) {
      var props = ref.props;
      var data = ref.data;
      var children = ref.children;
      var parent = ref.parent;

      var i18n = parent.$i18n;

      children = (children || []).filter(function (child) {
        return child.tag || (child.text = child.text.trim());
      });

      if (!i18n) {
        if (process.env.NODE_ENV !== 'production') {
          warn$1('Cannot find VueI18n instance!');
        }
        return children;
      }

      var path = props.path;
      var locale = props.locale;

      var params = {};
      var places = props.places || {};

      var hasPlaces = Array.isArray(places) ? places.length > 0 : Object.keys(places).length > 0;

      var everyPlace = children.every(function (child) {
        if (child.data && child.data.attrs) {
          var place = child.data.attrs.place;
          return typeof place !== 'undefined' && place !== '';
        }
      });

      if (process.env.NODE_ENV !== 'production' && hasPlaces && children.length > 0 && !everyPlace) {
        warn$1('If places prop is set, all child elements must have place prop set.');
      }

      if (Array.isArray(places)) {
        places.forEach(function (el, i) {
          params[i] = el;
        });
      } else {
        Object.keys(places).forEach(function (key) {
          params[key] = places[key];
        });
      }

      children.forEach(function (child, i) {
        var key = everyPlace ? "" + child.data.attrs.place : "" + i;
        params[key] = child;
      });

      return h(props.tag, data, i18n.i(path, locale, params));
    }
  };

  /*  */

  var numberComponent = {
    name: 'i18n-n',
    functional: true,
    props: {
      tag: {
        type: String,
        default: 'span'
      },
      value: {
        type: Number,
        required: true
      },
      format: {
        type: [String, Object]
      },
      locale: {
        type: String
      }
    },
    render: function render(h, ref) {
      var props = ref.props;
      var parent = ref.parent;
      var data = ref.data;

      var i18n = parent.$i18n;

      if (!i18n) {
        if (process.env.NODE_ENV !== 'production') {
          warn$1('Cannot find VueI18n instance!');
        }
        return null;
      }

      var key = null;
      var options = null;

      if (typeof props.format === 'string') {
        key = props.format;
      } else if (isObject(props.format)) {
        if (props.format.key) {
          key = props.format.key;
        }

        // Filter out number format options only
        options = Object.keys(props.format).reduce(function (acc, prop) {
          var obj;

          if (numberFormatKeys.includes(prop)) {
            return Object.assign({}, acc, (obj = {}, obj[prop] = props.format[prop], obj));
          }
          return acc;
        }, null);
      }

      var locale = props.locale || i18n.locale;
      var parts = i18n._ntp(props.value, locale, key, options);

      var values = parts.map(function (part, index) {
        var obj;

        var slot = data.scopedSlots && data.scopedSlots[part.type];
        return slot ? slot((obj = {}, obj[part.type] = part.value, obj.index = index, obj.parts = parts, obj)) : part.value;
      });

      return h(props.tag, {
        attrs: data.attrs,
        'class': data['class'],
        staticClass: data.staticClass
      }, values);
    }
  };

  /*  */

  function bind(el, binding, vnode) {
    if (!assert$1(el, vnode)) {
      return;
    }

    t(el, binding, vnode);
  }

  function update(el, binding, vnode, oldVNode) {
    if (!assert$1(el, vnode)) {
      return;
    }

    var i18n = vnode.context.$i18n;
    if (localeEqual(el, vnode) && looseEqual(binding.value, binding.oldValue) && looseEqual(el._localeMessage, i18n.getLocaleMessage(i18n.locale))) {
      return;
    }

    t(el, binding, vnode);
  }

  function unbind(el, binding, vnode, oldVNode) {
    var vm = vnode.context;
    if (!vm) {
      warn$1('Vue instance does not exists in VNode context');
      return;
    }

    var i18n = vnode.context.$i18n || {};
    if (!binding.modifiers.preserve && !i18n.preserveDirectiveContent) {
      el.textContent = '';
    }
    el._vt = undefined;
    delete el['_vt'];
    el._locale = undefined;
    delete el['_locale'];
    el._localeMessage = undefined;
    delete el['_localeMessage'];
  }

  function assert$1(el, vnode) {
    var vm = vnode.context;
    if (!vm) {
      warn$1('Vue instance does not exists in VNode context');
      return false;
    }

    if (!vm.$i18n) {
      warn$1('VueI18n instance does not exists in Vue instance');
      return false;
    }

    return true;
  }

  function localeEqual(el, vnode) {
    var vm = vnode.context;
    return el._locale === vm.$i18n.locale;
  }

  function t(el, binding, vnode) {
    var ref$1, ref$2;

    var value = binding.value;

    var ref = parseValue(value);
    var path = ref.path;
    var locale = ref.locale;
    var args = ref.args;
    var choice = ref.choice;
    if (!path && !locale && !args) {
      warn$1('value type not supported');
      return;
    }

    if (!path) {
      warn$1('`path` is required in v-t directive');
      return;
    }

    var vm = vnode.context;
    if (choice) {
      el._vt = el.textContent = (ref$1 = vm.$i18n).tc.apply(ref$1, [path, choice].concat(makeParams(locale, args)));
    } else {
      el._vt = el.textContent = (ref$2 = vm.$i18n).t.apply(ref$2, [path].concat(makeParams(locale, args)));
    }
    el._locale = vm.$i18n.locale;
    el._localeMessage = vm.$i18n.getLocaleMessage(vm.$i18n.locale);
  }

  function parseValue(value) {
    var path;
    var locale;
    var args;
    var choice;

    if (typeof value === 'string') {
      path = value;
    } else if (isPlainObject(value)) {
      path = value.path;
      locale = value.locale;
      args = value.args;
      choice = value.choice;
    }

    return { path: path, locale: locale, args: args, choice: choice };
  }

  function makeParams(locale, args) {
    var params = [];

    locale && params.push(locale);
    if (args && (Array.isArray(args) || isPlainObject(args))) {
      params.push(args);
    }

    return params;
  }

  var Vue;

  function install$1(_Vue) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && install$1.installed && _Vue === Vue) {
      warn$1('already installed.');
      return;
    }
    install$1.installed = true;

    Vue = _Vue;

    var version = Vue.version && Number(Vue.version.split('.')[0]) || -1;
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && version < 2) {
      warn$1("vue-i18n (" + install$1.version + ") need to use Vue 2.0 or later (Vue: " + Vue.version + ").");
      return;
    }

    extend$1(Vue);
    Vue.mixin(mixin);
    Vue.directive('t', { bind: bind, update: update, unbind: unbind });
    Vue.component(interpolationComponent.name, interpolationComponent);
    Vue.component(numberComponent.name, numberComponent);

    // use simple mergeStrategies to prevent i18n instance lose '__proto__'
    var strats = Vue.config.optionMergeStrategies;
    strats.i18n = function (parentVal, childVal) {
      return childVal === undefined ? parentVal : childVal;
    };
  }

  /*  */

  var BaseFormatter = function BaseFormatter() {
    this._caches = Object.create(null);
  };

  BaseFormatter.prototype.interpolate = function interpolate(message, values) {
    if (!values) {
      return [message];
    }
    var tokens = this._caches[message];
    if (!tokens) {
      tokens = parse$1(message);
      this._caches[message] = tokens;
    }
    return compile$1(tokens, values);
  };

  var RE_TOKEN_LIST_VALUE = /^(?:\d)+/;
  var RE_TOKEN_NAMED_VALUE = /^(?:\w)+/;

  function parse$1(format) {
    var tokens = [];
    var position = 0;

    var text = '';
    while (position < format.length) {
      var char = format[position++];
      if (char === '{') {
        if (text) {
          tokens.push({ type: 'text', value: text });
        }

        text = '';
        var sub = '';
        char = format[position++];
        while (char !== undefined && char !== '}') {
          sub += char;
          char = format[position++];
        }
        var isClosed = char === '}';

        var type = RE_TOKEN_LIST_VALUE.test(sub) ? 'list' : isClosed && RE_TOKEN_NAMED_VALUE.test(sub) ? 'named' : 'unknown';
        tokens.push({ value: sub, type: type });
      } else if (char === '%') {
        // when found rails i18n syntax, skip text capture
        if (format[position] !== '{') {
          text += char;
        }
      } else {
        text += char;
      }
    }

    text && tokens.push({ type: 'text', value: text });

    return tokens;
  }

  function compile$1(tokens, values) {
    var compiled = [];
    var index = 0;

    var mode = Array.isArray(values) ? 'list' : isObject(values) ? 'named' : 'unknown';
    if (mode === 'unknown') {
      return compiled;
    }

    while (index < tokens.length) {
      var token = tokens[index];
      switch (token.type) {
        case 'text':
          compiled.push(token.value);
          break;
        case 'list':
          compiled.push(values[parseInt(token.value, 10)]);
          break;
        case 'named':
          if (mode === 'named') {
            compiled.push(values[token.value]);
          } else {
            if (process.env.NODE_ENV !== 'production') {
              warn$1("Type of token '" + token.type + "' and format of value '" + mode + "' don't match!");
            }
          }
          break;
        case 'unknown':
          if (process.env.NODE_ENV !== 'production') {
            warn$1("Detect 'unknown' type of token!");
          }
          break;
      }
      index++;
    }

    return compiled;
  }

  /*  */

  /**
   *  Path parser
   *  - Inspired:
   *    Vue.js Path parser
   */

  // actions
  var APPEND = 0;
  var PUSH = 1;
  var INC_SUB_PATH_DEPTH = 2;
  var PUSH_SUB_PATH = 3;

  // states
  var BEFORE_PATH = 0;
  var IN_PATH = 1;
  var BEFORE_IDENT = 2;
  var IN_IDENT = 3;
  var IN_SUB_PATH = 4;
  var IN_SINGLE_QUOTE = 5;
  var IN_DOUBLE_QUOTE = 6;
  var AFTER_PATH = 7;
  var ERROR = 8;

  var pathStateMachine = [];

  pathStateMachine[BEFORE_PATH] = {
    'ws': [BEFORE_PATH],
    'ident': [IN_IDENT, APPEND],
    '[': [IN_SUB_PATH],
    'eof': [AFTER_PATH]
  };

  pathStateMachine[IN_PATH] = {
    'ws': [IN_PATH],
    '.': [BEFORE_IDENT],
    '[': [IN_SUB_PATH],
    'eof': [AFTER_PATH]
  };

  pathStateMachine[BEFORE_IDENT] = {
    'ws': [BEFORE_IDENT],
    'ident': [IN_IDENT, APPEND],
    '0': [IN_IDENT, APPEND],
    'number': [IN_IDENT, APPEND]
  };

  pathStateMachine[IN_IDENT] = {
    'ident': [IN_IDENT, APPEND],
    '0': [IN_IDENT, APPEND],
    'number': [IN_IDENT, APPEND],
    'ws': [IN_PATH, PUSH],
    '.': [BEFORE_IDENT, PUSH],
    '[': [IN_SUB_PATH, PUSH],
    'eof': [AFTER_PATH, PUSH]
  };

  pathStateMachine[IN_SUB_PATH] = {
    "'": [IN_SINGLE_QUOTE, APPEND],
    '"': [IN_DOUBLE_QUOTE, APPEND],
    '[': [IN_SUB_PATH, INC_SUB_PATH_DEPTH],
    ']': [IN_PATH, PUSH_SUB_PATH],
    'eof': ERROR,
    'else': [IN_SUB_PATH, APPEND]
  };

  pathStateMachine[IN_SINGLE_QUOTE] = {
    "'": [IN_SUB_PATH, APPEND],
    'eof': ERROR,
    'else': [IN_SINGLE_QUOTE, APPEND]
  };

  pathStateMachine[IN_DOUBLE_QUOTE] = {
    '"': [IN_SUB_PATH, APPEND],
    'eof': ERROR,
    'else': [IN_DOUBLE_QUOTE, APPEND]
  };

  /**
   * Check if an expression is a literal value.
   */

  var literalValueRE = /^\s?(?:true|false|-?[\d.]+|'[^']*'|"[^"]*")\s?$/;
  function isLiteral(exp) {
    return literalValueRE.test(exp);
  }

  /**
   * Strip quotes from a string
   */

  function stripQuotes(str) {
    var a = str.charCodeAt(0);
    var b = str.charCodeAt(str.length - 1);
    return a === b && (a === 0x22 || a === 0x27) ? str.slice(1, -1) : str;
  }

  /**
   * Determine the type of a character in a keypath.
   */

  function getPathCharType(ch) {
    if (ch === undefined || ch === null) {
      return 'eof';
    }

    var code = ch.charCodeAt(0);

    switch (code) {
      case 0x5B: // [
      case 0x5D: // ]
      case 0x2E: // .
      case 0x22: // "
      case 0x27:
        // '
        return ch;

      case 0x5F: // _
      case 0x24: // $
      case 0x2D:
        // -
        return 'ident';

      case 0x09: // Tab
      case 0x0A: // Newline
      case 0x0D: // Return
      case 0xA0: // No-break space
      case 0xFEFF: // Byte Order Mark
      case 0x2028: // Line Separator
      case 0x2029:
        // Paragraph Separator
        return 'ws';
    }

    return 'ident';
  }

  /**
   * Format a subPath, return its plain form if it is
   * a literal string or number. Otherwise prepend the
   * dynamic indicator (*).
   */

  function formatSubPath(path) {
    var trimmed = path.trim();
    // invalid leading 0
    if (path.charAt(0) === '0' && isNaN(path)) {
      return false;
    }

    return isLiteral(trimmed) ? stripQuotes(trimmed) : '*' + trimmed;
  }

  /**
   * Parse a string path into an array of segments
   */

  function parse$1$1(path) {
    var keys = [];
    var index = -1;
    var mode = BEFORE_PATH;
    var subPathDepth = 0;
    var c;
    var key;
    var newChar;
    var type;
    var transition;
    var action;
    var typeMap;
    var actions = [];

    actions[PUSH] = function () {
      if (key !== undefined) {
        keys.push(key);
        key = undefined;
      }
    };

    actions[APPEND] = function () {
      if (key === undefined) {
        key = newChar;
      } else {
        key += newChar;
      }
    };

    actions[INC_SUB_PATH_DEPTH] = function () {
      actions[APPEND]();
      subPathDepth++;
    };

    actions[PUSH_SUB_PATH] = function () {
      if (subPathDepth > 0) {
        subPathDepth--;
        mode = IN_SUB_PATH;
        actions[APPEND]();
      } else {
        subPathDepth = 0;
        key = formatSubPath(key);
        if (key === false) {
          return false;
        } else {
          actions[PUSH]();
        }
      }
    };

    function maybeUnescapeQuote() {
      var nextChar = path[index + 1];
      if (mode === IN_SINGLE_QUOTE && nextChar === "'" || mode === IN_DOUBLE_QUOTE && nextChar === '"') {
        index++;
        newChar = '\\' + nextChar;
        actions[APPEND]();
        return true;
      }
    }

    while (mode !== null) {
      index++;
      c = path[index];

      if (c === '\\' && maybeUnescapeQuote()) {
        continue;
      }

      type = getPathCharType(c);
      typeMap = pathStateMachine[mode];
      transition = typeMap[type] || typeMap['else'] || ERROR;

      if (transition === ERROR) {
        return; // parse error
      }

      mode = transition[0];
      action = actions[transition[1]];
      if (action) {
        newChar = transition[2];
        newChar = newChar === undefined ? c : newChar;
        if (action() === false) {
          return;
        }
      }

      if (mode === AFTER_PATH) {
        return keys;
      }
    }
  }

  var I18nPath = function I18nPath() {
    this._cache = Object.create(null);
  };

  /**
   * External parse that check for a cache hit first
   */
  I18nPath.prototype.parsePath = function parsePath(path) {
    var hit = this._cache[path];
    if (!hit) {
      hit = parse$1$1(path);
      if (hit) {
        this._cache[path] = hit;
      }
    }
    return hit || [];
  };

  /**
   * Get path value from path string
   */
  I18nPath.prototype.getPathValue = function getPathValue(obj, path) {
    if (!isObject(obj)) {
      return null;
    }

    var paths = this.parsePath(path);
    if (paths.length === 0) {
      return null;
    } else {
      var length = paths.length;
      var last = obj;
      var i = 0;
      while (i < length) {
        var value = last[paths[i]];
        if (value === undefined) {
          return null;
        }
        last = value;
        i++;
      }

      return last;
    }
  };

  /*  */

  var htmlTagMatcher = /<\/?[\w\s="/.':;#-\/]+>/;
  var linkKeyMatcher = /(?:@(?:\.[a-z]+)?:(?:[\w\-_|.]+|\([\w\-_|.]+\)))/g;
  var linkKeyPrefixMatcher = /^@(?:\.([a-z]+))?:/;
  var bracketsMatcher = /[()]/g;
  var formatters = {
    'upper': function (str) {
      return str.toLocaleUpperCase();
    },
    'lower': function (str) {
      return str.toLocaleLowerCase();
    }
  };

  var defaultFormatter = new BaseFormatter();

  var VueI18n = function VueI18n(options) {
    var this$1 = this;
    if (options === void 0) options = {};

    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #290
    /* istanbul ignore if */
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      install$1(window.Vue);
    }

    var locale = options.locale || 'en-US';
    var fallbackLocale = options.fallbackLocale || 'en-US';
    var messages = options.messages || {};
    var dateTimeFormats = options.dateTimeFormats || {};
    var numberFormats = options.numberFormats || {};

    this._vm = null;
    this._formatter = options.formatter || defaultFormatter;
    this._missing = options.missing || null;
    this._root = options.root || null;
    this._sync = options.sync === undefined ? true : !!options.sync;
    this._fallbackRoot = options.fallbackRoot === undefined ? true : !!options.fallbackRoot;
    this._silentTranslationWarn = options.silentTranslationWarn === undefined ? false : !!options.silentTranslationWarn;
    this._silentFallbackWarn = options.silentFallbackWarn === undefined ? false : !!options.silentFallbackWarn;
    this._dateTimeFormatters = {};
    this._numberFormatters = {};
    this._path = new I18nPath();
    this._dataListeners = [];
    this._preserveDirectiveContent = options.preserveDirectiveContent === undefined ? false : !!options.preserveDirectiveContent;
    this.pluralizationRules = options.pluralizationRules || {};
    this._warnHtmlInMessage = options.warnHtmlInMessage || 'off';

    this._exist = function (message, key) {
      if (!message || !key) {
        return false;
      }
      if (!isNull(this$1._path.getPathValue(message, key))) {
        return true;
      }
      // fallback for flat key
      if (message[key]) {
        return true;
      }
      return false;
    };

    if (this._warnHtmlInMessage === 'warn' || this._warnHtmlInMessage === 'error') {
      Object.keys(messages).forEach(function (locale) {
        this$1._checkLocaleMessage(locale, this$1._warnHtmlInMessage, messages[locale]);
      });
    }

    this._initVM({
      locale: locale,
      fallbackLocale: fallbackLocale,
      messages: messages,
      dateTimeFormats: dateTimeFormats,
      numberFormats: numberFormats
    });
  };

  var prototypeAccessors$1 = { vm: { configurable: true }, messages: { configurable: true }, dateTimeFormats: { configurable: true }, numberFormats: { configurable: true }, availableLocales: { configurable: true }, locale: { configurable: true }, fallbackLocale: { configurable: true }, missing: { configurable: true }, formatter: { configurable: true }, silentTranslationWarn: { configurable: true }, silentFallbackWarn: { configurable: true }, preserveDirectiveContent: { configurable: true }, warnHtmlInMessage: { configurable: true } };

  VueI18n.prototype._checkLocaleMessage = function _checkLocaleMessage(locale, level, message) {
    var paths = [];

    var fn = function (level, locale, message, paths) {
      if (isPlainObject(message)) {
        Object.keys(message).forEach(function (key) {
          var val = message[key];
          if (isPlainObject(val)) {
            paths.push(key);
            paths.push('.');
            fn(level, locale, val, paths);
            paths.pop();
            paths.pop();
          } else {
            paths.push(key);
            fn(level, locale, val, paths);
            paths.pop();
          }
        });
      } else if (Array.isArray(message)) {
        message.forEach(function (item, index) {
          if (isPlainObject(item)) {
            paths.push("[" + index + "]");
            paths.push('.');
            fn(level, locale, item, paths);
            paths.pop();
            paths.pop();
          } else {
            paths.push("[" + index + "]");
            fn(level, locale, item, paths);
            paths.pop();
          }
        });
      } else if (typeof message === 'string') {
        var ret = htmlTagMatcher.test(message);
        if (ret) {
          var msg = "Detected HTML in message '" + message + "' of keypath '" + paths.join('') + "' at '" + locale + "'. Consider component interpolation with '<i18n>' to avoid XSS. See https://bit.ly/2ZqJzkp";
          if (level === 'warn') {
            warn$1(msg);
          } else if (level === 'error') {
            error(msg);
          }
        }
      }
    };

    fn(level, locale, message, paths);
  };

  VueI18n.prototype._initVM = function _initVM(data) {
    var silent = Vue.config.silent;
    Vue.config.silent = true;
    this._vm = new Vue({ data: data });
    Vue.config.silent = silent;
  };

  VueI18n.prototype.destroyVM = function destroyVM() {
    this._vm.$destroy();
  };

  VueI18n.prototype.subscribeDataChanging = function subscribeDataChanging(vm) {
    this._dataListeners.push(vm);
  };

  VueI18n.prototype.unsubscribeDataChanging = function unsubscribeDataChanging(vm) {
    remove(this._dataListeners, vm);
  };

  VueI18n.prototype.watchI18nData = function watchI18nData() {
    var self = this;
    return this._vm.$watch('$data', function () {
      var i = self._dataListeners.length;
      while (i--) {
        Vue.nextTick(function () {
          self._dataListeners[i] && self._dataListeners[i].$forceUpdate();
        });
      }
    }, { deep: true });
  };

  VueI18n.prototype.watchLocale = function watchLocale() {
    /* istanbul ignore if */
    if (!this._sync || !this._root) {
      return null;
    }
    var target = this._vm;
    return this._root.$i18n.vm.$watch('locale', function (val) {
      target.$set(target, 'locale', val);
      target.$forceUpdate();
    }, { immediate: true });
  };

  prototypeAccessors$1.vm.get = function () {
    return this._vm;
  };

  prototypeAccessors$1.messages.get = function () {
    return looseClone(this._getMessages());
  };
  prototypeAccessors$1.dateTimeFormats.get = function () {
    return looseClone(this._getDateTimeFormats());
  };
  prototypeAccessors$1.numberFormats.get = function () {
    return looseClone(this._getNumberFormats());
  };
  prototypeAccessors$1.availableLocales.get = function () {
    return Object.keys(this.messages).sort();
  };

  prototypeAccessors$1.locale.get = function () {
    return this._vm.locale;
  };
  prototypeAccessors$1.locale.set = function (locale) {
    this._vm.$set(this._vm, 'locale', locale);
  };

  prototypeAccessors$1.fallbackLocale.get = function () {
    return this._vm.fallbackLocale;
  };
  prototypeAccessors$1.fallbackLocale.set = function (locale) {
    this._vm.$set(this._vm, 'fallbackLocale', locale);
  };

  prototypeAccessors$1.missing.get = function () {
    return this._missing;
  };
  prototypeAccessors$1.missing.set = function (handler) {
    this._missing = handler;
  };

  prototypeAccessors$1.formatter.get = function () {
    return this._formatter;
  };
  prototypeAccessors$1.formatter.set = function (formatter) {
    this._formatter = formatter;
  };

  prototypeAccessors$1.silentTranslationWarn.get = function () {
    return this._silentTranslationWarn;
  };
  prototypeAccessors$1.silentTranslationWarn.set = function (silent) {
    this._silentTranslationWarn = silent;
  };

  prototypeAccessors$1.silentFallbackWarn.get = function () {
    return this._silentFallbackWarn;
  };
  prototypeAccessors$1.silentFallbackWarn.set = function (silent) {
    this._silentFallbackWarn = silent;
  };

  prototypeAccessors$1.preserveDirectiveContent.get = function () {
    return this._preserveDirectiveContent;
  };
  prototypeAccessors$1.preserveDirectiveContent.set = function (preserve) {
    this._preserveDirectiveContent = preserve;
  };

  prototypeAccessors$1.warnHtmlInMessage.get = function () {
    return this._warnHtmlInMessage;
  };
  prototypeAccessors$1.warnHtmlInMessage.set = function (level) {
    var this$1 = this;

    var orgLevel = this._warnHtmlInMessage;
    this._warnHtmlInMessage = level;
    if (orgLevel !== level && (level === 'warn' || level === 'error')) {
      var messages = this._getMessages();
      Object.keys(messages).forEach(function (locale) {
        this$1._checkLocaleMessage(locale, this$1._warnHtmlInMessage, messages[locale]);
      });
    }
  };

  VueI18n.prototype._getMessages = function _getMessages() {
    return this._vm.messages;
  };
  VueI18n.prototype._getDateTimeFormats = function _getDateTimeFormats() {
    return this._vm.dateTimeFormats;
  };
  VueI18n.prototype._getNumberFormats = function _getNumberFormats() {
    return this._vm.numberFormats;
  };

  VueI18n.prototype._warnDefault = function _warnDefault(locale, key, result, vm, values) {
    if (!isNull(result)) {
      return result;
    }
    if (this._missing) {
      var missingRet = this._missing.apply(null, [locale, key, vm, values]);
      if (typeof missingRet === 'string') {
        return missingRet;
      }
    } else {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Cannot translate the value of keypath '" + key + "'. " + 'Use the value of keypath as default.');
      }
    }
    return key;
  };

  VueI18n.prototype._isFallbackRoot = function _isFallbackRoot(val) {
    return !val && !isNull(this._root) && this._fallbackRoot;
  };

  VueI18n.prototype._isSilentFallback = function _isSilentFallback(locale) {
    return this._silentFallbackWarn && (this._isFallbackRoot() || locale !== this.fallbackLocale);
  };

  VueI18n.prototype._interpolate = function _interpolate(locale, message, key, host, interpolateMode, values, visitedLinkStack) {
    if (!message) {
      return null;
    }

    var pathRet = this._path.getPathValue(message, key);
    if (Array.isArray(pathRet) || isPlainObject(pathRet)) {
      return pathRet;
    }

    var ret;
    if (isNull(pathRet)) {
      /* istanbul ignore else */
      if (isPlainObject(message)) {
        ret = message[key];
        if (typeof ret !== 'string') {
          if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn && !this._isSilentFallback(locale)) {
            warn$1("Value of key '" + key + "' is not a string!");
          }
          return null;
        }
      } else {
        return null;
      }
    } else {
      /* istanbul ignore else */
      if (typeof pathRet === 'string') {
        ret = pathRet;
      } else {
        if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn && !this._isSilentFallback(locale)) {
          warn$1("Value of key '" + key + "' is not a string!");
        }
        return null;
      }
    }

    // Check for the existence of links within the translated string
    if (ret.indexOf('@:') >= 0 || ret.indexOf('@.') >= 0) {
      ret = this._link(locale, message, ret, host, 'raw', values, visitedLinkStack);
    }

    return this._render(ret, interpolateMode, values, key);
  };

  VueI18n.prototype._link = function _link(locale, message, str, host, interpolateMode, values, visitedLinkStack) {
    var ret = str;

    // Match all the links within the local
    // We are going to replace each of
    // them with its translation
    var matches = ret.match(linkKeyMatcher);
    for (var idx in matches) {
      // ie compatible: filter custom array
      // prototype method
      if (!matches.hasOwnProperty(idx)) {
        continue;
      }
      var link = matches[idx];
      var linkKeyPrefixMatches = link.match(linkKeyPrefixMatcher);
      var linkPrefix = linkKeyPrefixMatches[0];
      var formatterName = linkKeyPrefixMatches[1];

      // Remove the leading @:, @.case: and the brackets
      var linkPlaceholder = link.replace(linkPrefix, '').replace(bracketsMatcher, '');

      if (visitedLinkStack.includes(linkPlaceholder)) {
        if (process.env.NODE_ENV !== 'production') {
          warn$1("Circular reference found. \"" + link + "\" is already visited in the chain of " + visitedLinkStack.reverse().join(' <- '));
        }
        return ret;
      }
      visitedLinkStack.push(linkPlaceholder);

      // Translate the link
      var translated = this._interpolate(locale, message, linkPlaceholder, host, interpolateMode === 'raw' ? 'string' : interpolateMode, interpolateMode === 'raw' ? undefined : values, visitedLinkStack);

      if (this._isFallbackRoot(translated)) {
        if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
          warn$1("Fall back to translate the link placeholder '" + linkPlaceholder + "' with root locale.");
        }
        /* istanbul ignore if */
        if (!this._root) {
          throw Error('unexpected error');
        }
        var root = this._root.$i18n;
        translated = root._translate(root._getMessages(), root.locale, root.fallbackLocale, linkPlaceholder, host, interpolateMode, values);
      }
      translated = this._warnDefault(locale, linkPlaceholder, translated, host, Array.isArray(values) ? values : [values]);
      if (formatters.hasOwnProperty(formatterName)) {
        translated = formatters[formatterName](translated);
      }

      visitedLinkStack.pop();

      // Replace the link with the translated
      ret = !translated ? ret : ret.replace(link, translated);
    }

    return ret;
  };

  VueI18n.prototype._render = function _render(message, interpolateMode, values, path) {
    var ret = this._formatter.interpolate(message, values, path);

    // If the custom formatter refuses to work - apply the default one
    if (!ret) {
      ret = defaultFormatter.interpolate(message, values, path);
    }

    // if interpolateMode is **not** 'string' ('row'),
    // return the compiled data (e.g. ['foo', VNode, 'bar']) with formatter
    return interpolateMode === 'string' ? ret.join('') : ret;
  };

  VueI18n.prototype._translate = function _translate(messages, locale, fallback, key, host, interpolateMode, args) {
    var res = this._interpolate(locale, messages[locale], key, host, interpolateMode, args, [key]);
    if (!isNull(res)) {
      return res;
    }

    res = this._interpolate(fallback, messages[fallback], key, host, interpolateMode, args, [key]);
    if (!isNull(res)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn && !this._silentFallbackWarn) {
        warn$1("Fall back to translate the keypath '" + key + "' with '" + fallback + "' locale.");
      }
      return res;
    } else {
      return null;
    }
  };

  VueI18n.prototype._t = function _t(key, _locale, messages, host) {
    var ref;

    var values = [],
        len = arguments.length - 4;
    while (len-- > 0) values[len] = arguments[len + 4];
    if (!key) {
      return '';
    }

    var parsedArgs = parseArgs.apply(void 0, values);
    var locale = parsedArgs.locale || _locale;

    var ret = this._translate(messages, locale, this.fallbackLocale, key, host, 'string', parsedArgs.params);
    if (this._isFallbackRoot(ret)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn && !this._silentFallbackWarn) {
        warn$1("Fall back to translate the keypath '" + key + "' with root locale.");
      }
      /* istanbul ignore if */
      if (!this._root) {
        throw Error('unexpected error');
      }
      return (ref = this._root).$t.apply(ref, [key].concat(values));
    } else {
      return this._warnDefault(locale, key, ret, host, values);
    }
  };

  VueI18n.prototype.t = function t(key) {
    var ref;

    var values = [],
        len = arguments.length - 1;
    while (len-- > 0) values[len] = arguments[len + 1];
    return (ref = this)._t.apply(ref, [key, this.locale, this._getMessages(), null].concat(values));
  };

  VueI18n.prototype._i = function _i(key, locale, messages, host, values) {
    var ret = this._translate(messages, locale, this.fallbackLocale, key, host, 'raw', values);
    if (this._isFallbackRoot(ret)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to interpolate the keypath '" + key + "' with root locale.");
      }
      if (!this._root) {
        throw Error('unexpected error');
      }
      return this._root.$i18n.i(key, locale, values);
    } else {
      return this._warnDefault(locale, key, ret, host, [values]);
    }
  };

  VueI18n.prototype.i = function i(key, locale, values) {
    /* istanbul ignore if */
    if (!key) {
      return '';
    }

    if (typeof locale !== 'string') {
      locale = this.locale;
    }

    return this._i(key, locale, this._getMessages(), null, values);
  };

  VueI18n.prototype._tc = function _tc(key, _locale, messages, host, choice) {
    var ref;

    var values = [],
        len = arguments.length - 5;
    while (len-- > 0) values[len] = arguments[len + 5];
    if (!key) {
      return '';
    }
    if (choice === undefined) {
      choice = 1;
    }

    var predefined = { 'count': choice, 'n': choice };
    var parsedArgs = parseArgs.apply(void 0, values);
    parsedArgs.params = Object.assign(predefined, parsedArgs.params);
    values = parsedArgs.locale === null ? [parsedArgs.params] : [parsedArgs.locale, parsedArgs.params];
    return this.fetchChoice((ref = this)._t.apply(ref, [key, _locale, messages, host].concat(values)), choice);
  };

  VueI18n.prototype.fetchChoice = function fetchChoice(message, choice) {
    /* istanbul ignore if */
    if (!message && typeof message !== 'string') {
      return null;
    }
    var choices = message.split('|');

    choice = this.getChoiceIndex(choice, choices.length);
    if (!choices[choice]) {
      return message;
    }
    return choices[choice].trim();
  };

  /**
   * @param choice {number} a choice index given by the input to $tc: `$tc('path.to.rule', choiceIndex)`
   * @param choicesLength {number} an overall amount of available choices
   * @returns a final choice index
  */
  VueI18n.prototype.getChoiceIndex = function getChoiceIndex(choice, choicesLength) {
    // Default (old) getChoiceIndex implementation - english-compatible
    var defaultImpl = function (_choice, _choicesLength) {
      _choice = Math.abs(_choice);

      if (_choicesLength === 2) {
        return _choice ? _choice > 1 ? 1 : 0 : 1;
      }

      return _choice ? Math.min(_choice, 2) : 0;
    };

    if (this.locale in this.pluralizationRules) {
      return this.pluralizationRules[this.locale].apply(this, [choice, choicesLength]);
    } else {
      return defaultImpl(choice, choicesLength);
    }
  };

  VueI18n.prototype.tc = function tc(key, choice) {
    var ref;

    var values = [],
        len = arguments.length - 2;
    while (len-- > 0) values[len] = arguments[len + 2];
    return (ref = this)._tc.apply(ref, [key, this.locale, this._getMessages(), null, choice].concat(values));
  };

  VueI18n.prototype._te = function _te(key, locale, messages) {
    var args = [],
        len = arguments.length - 3;
    while (len-- > 0) args[len] = arguments[len + 3];

    var _locale = parseArgs.apply(void 0, args).locale || locale;
    return this._exist(messages[_locale], key);
  };

  VueI18n.prototype.te = function te(key, locale) {
    return this._te(key, this.locale, this._getMessages(), locale);
  };

  VueI18n.prototype.getLocaleMessage = function getLocaleMessage(locale) {
    return looseClone(this._vm.messages[locale] || {});
  };

  VueI18n.prototype.setLocaleMessage = function setLocaleMessage(locale, message) {
    if (this._warnHtmlInMessage === 'warn' || this._warnHtmlInMessage === 'error') {
      this._checkLocaleMessage(locale, this._warnHtmlInMessage, message);
      if (this._warnHtmlInMessage === 'error') {
        return;
      }
    }
    this._vm.$set(this._vm.messages, locale, message);
  };

  VueI18n.prototype.mergeLocaleMessage = function mergeLocaleMessage(locale, message) {
    if (this._warnHtmlInMessage === 'warn' || this._warnHtmlInMessage === 'error') {
      this._checkLocaleMessage(locale, this._warnHtmlInMessage, message);
      if (this._warnHtmlInMessage === 'error') {
        return;
      }
    }
    this._vm.$set(this._vm.messages, locale, merge(this._vm.messages[locale] || {}, message));
  };

  VueI18n.prototype.getDateTimeFormat = function getDateTimeFormat(locale) {
    return looseClone(this._vm.dateTimeFormats[locale] || {});
  };

  VueI18n.prototype.setDateTimeFormat = function setDateTimeFormat(locale, format) {
    this._vm.$set(this._vm.dateTimeFormats, locale, format);
  };

  VueI18n.prototype.mergeDateTimeFormat = function mergeDateTimeFormat(locale, format) {
    this._vm.$set(this._vm.dateTimeFormats, locale, merge(this._vm.dateTimeFormats[locale] || {}, format));
  };

  VueI18n.prototype._localizeDateTime = function _localizeDateTime(value, locale, fallback, dateTimeFormats, key) {
    var _locale = locale;
    var formats = dateTimeFormats[_locale];

    // fallback locale
    if (isNull(formats) || isNull(formats[key])) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to '" + fallback + "' datetime formats from '" + locale + " datetime formats.");
      }
      _locale = fallback;
      formats = dateTimeFormats[_locale];
    }

    if (isNull(formats) || isNull(formats[key])) {
      return null;
    } else {
      var format = formats[key];
      var id = _locale + "__" + key;
      var formatter = this._dateTimeFormatters[id];
      if (!formatter) {
        formatter = this._dateTimeFormatters[id] = new Intl.DateTimeFormat(_locale, format);
      }
      return formatter.format(value);
    }
  };

  VueI18n.prototype._d = function _d(value, locale, key) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && !VueI18n.availabilities.dateTimeFormat) {
      warn$1('Cannot format a Date value due to not supported Intl.DateTimeFormat.');
      return '';
    }

    if (!key) {
      return new Intl.DateTimeFormat(locale).format(value);
    }

    var ret = this._localizeDateTime(value, locale, this.fallbackLocale, this._getDateTimeFormats(), key);
    if (this._isFallbackRoot(ret)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to datetime localization of root: key '" + key + "' .");
      }
      /* istanbul ignore if */
      if (!this._root) {
        throw Error('unexpected error');
      }
      return this._root.$i18n.d(value, key, locale);
    } else {
      return ret || '';
    }
  };

  VueI18n.prototype.d = function d(value) {
    var args = [],
        len = arguments.length - 1;
    while (len-- > 0) args[len] = arguments[len + 1];

    var locale = this.locale;
    var key = null;

    if (args.length === 1) {
      if (typeof args[0] === 'string') {
        key = args[0];
      } else if (isObject(args[0])) {
        if (args[0].locale) {
          locale = args[0].locale;
        }
        if (args[0].key) {
          key = args[0].key;
        }
      }
    } else if (args.length === 2) {
      if (typeof args[0] === 'string') {
        key = args[0];
      }
      if (typeof args[1] === 'string') {
        locale = args[1];
      }
    }

    return this._d(value, locale, key);
  };

  VueI18n.prototype.getNumberFormat = function getNumberFormat(locale) {
    return looseClone(this._vm.numberFormats[locale] || {});
  };

  VueI18n.prototype.setNumberFormat = function setNumberFormat(locale, format) {
    this._vm.$set(this._vm.numberFormats, locale, format);
  };

  VueI18n.prototype.mergeNumberFormat = function mergeNumberFormat(locale, format) {
    this._vm.$set(this._vm.numberFormats, locale, merge(this._vm.numberFormats[locale] || {}, format));
  };

  VueI18n.prototype._getNumberFormatter = function _getNumberFormatter(value, locale, fallback, numberFormats, key, options) {
    var _locale = locale;
    var formats = numberFormats[_locale];

    // fallback locale
    if (isNull(formats) || isNull(formats[key])) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to '" + fallback + "' number formats from '" + locale + " number formats.");
      }
      _locale = fallback;
      formats = numberFormats[_locale];
    }

    if (isNull(formats) || isNull(formats[key])) {
      return null;
    } else {
      var format = formats[key];

      var formatter;
      if (options) {
        // If options specified - create one time number formatter
        formatter = new Intl.NumberFormat(_locale, Object.assign({}, format, options));
      } else {
        var id = _locale + "__" + key;
        formatter = this._numberFormatters[id];
        if (!formatter) {
          formatter = this._numberFormatters[id] = new Intl.NumberFormat(_locale, format);
        }
      }
      return formatter;
    }
  };

  VueI18n.prototype._n = function _n(value, locale, key, options) {
    /* istanbul ignore if */
    if (!VueI18n.availabilities.numberFormat) {
      if (process.env.NODE_ENV !== 'production') {
        warn$1('Cannot format a Number value due to not supported Intl.NumberFormat.');
      }
      return '';
    }

    if (!key) {
      var nf = !options ? new Intl.NumberFormat(locale) : new Intl.NumberFormat(locale, options);
      return nf.format(value);
    }

    var formatter = this._getNumberFormatter(value, locale, this.fallbackLocale, this._getNumberFormats(), key, options);
    var ret = formatter && formatter.format(value);
    if (this._isFallbackRoot(ret)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to number localization of root: key '" + key + "' .");
      }
      /* istanbul ignore if */
      if (!this._root) {
        throw Error('unexpected error');
      }
      return this._root.$i18n.n(value, Object.assign({}, { key: key, locale: locale }, options));
    } else {
      return ret || '';
    }
  };

  VueI18n.prototype.n = function n(value) {
    var args = [],
        len = arguments.length - 1;
    while (len-- > 0) args[len] = arguments[len + 1];

    var locale = this.locale;
    var key = null;
    var options = null;

    if (args.length === 1) {
      if (typeof args[0] === 'string') {
        key = args[0];
      } else if (isObject(args[0])) {
        if (args[0].locale) {
          locale = args[0].locale;
        }
        if (args[0].key) {
          key = args[0].key;
        }

        // Filter out number format options only
        options = Object.keys(args[0]).reduce(function (acc, key) {
          var obj;

          if (numberFormatKeys.includes(key)) {
            return Object.assign({}, acc, (obj = {}, obj[key] = args[0][key], obj));
          }
          return acc;
        }, null);
      }
    } else if (args.length === 2) {
      if (typeof args[0] === 'string') {
        key = args[0];
      }
      if (typeof args[1] === 'string') {
        locale = args[1];
      }
    }

    return this._n(value, locale, key, options);
  };

  VueI18n.prototype._ntp = function _ntp(value, locale, key, options) {
    /* istanbul ignore if */
    if (!VueI18n.availabilities.numberFormat) {
      if (process.env.NODE_ENV !== 'production') {
        warn$1('Cannot format to parts a Number value due to not supported Intl.NumberFormat.');
      }
      return [];
    }

    if (!key) {
      var nf = !options ? new Intl.NumberFormat(locale) : new Intl.NumberFormat(locale, options);
      return nf.formatToParts(value);
    }

    var formatter = this._getNumberFormatter(value, locale, this.fallbackLocale, this._getNumberFormats(), key, options);
    var ret = formatter && formatter.formatToParts(value);
    if (this._isFallbackRoot(ret)) {
      if (process.env.NODE_ENV !== 'production' && !this._silentTranslationWarn) {
        warn$1("Fall back to format number to parts of root: key '" + key + "' .");
      }
      /* istanbul ignore if */
      if (!this._root) {
        throw Error('unexpected error');
      }
      return this._root.$i18n._ntp(value, locale, key, options);
    } else {
      return ret || [];
    }
  };

  Object.defineProperties(VueI18n.prototype, prototypeAccessors$1);

  var availabilities;
  // $FlowFixMe
  Object.defineProperty(VueI18n, 'availabilities', {
    get: function get() {
      if (!availabilities) {
        var intlDefined = typeof Intl !== 'undefined';
        availabilities = {
          dateTimeFormat: intlDefined && typeof Intl.DateTimeFormat !== 'undefined',
          numberFormat: intlDefined && typeof Intl.NumberFormat !== 'undefined'
        };
      }

      return availabilities;
    }
  });

  VueI18n.install = install$1;
  VueI18n.version = '8.12.0';

  function extend$2() {
    var i = 0;
    var result = {};
    for (; i < arguments.length; i++) {
      var attributes = arguments[i];
      for (var key in attributes) {
        result[key] = attributes[key];
      }
    }
    return result;
  }

  function decode$1(s) {
    return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
  }

  function init(converter) {
    function api() {}

    function set(key, value, attributes) {
      if (typeof document === 'undefined') {
        return;
      }

      attributes = extend$2({
        path: '/'
      }, api.defaults, attributes);

      if (typeof attributes.expires === 'number') {
        attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
      }

      // We're using "expires" because "max-age" is not supported by IE
      attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

      try {
        var result = JSON.stringify(value);
        if (/^[\{\[]/.test(result)) {
          value = result;
        }
      } catch (e) {}

      value = converter.write ? converter.write(value, key) : encodeURIComponent(String(value)).replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

      key = encodeURIComponent(String(key)).replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent).replace(/[\(\)]/g, escape);

      var stringifiedAttributes = '';
      for (var attributeName in attributes) {
        if (!attributes[attributeName]) {
          continue;
        }
        stringifiedAttributes += '; ' + attributeName;
        if (attributes[attributeName] === true) {
          continue;
        }

        // Considers RFC 6265 section 5.2:
        // ...
        // 3.  If the remaining unparsed-attributes contains a %x3B (";")
        //     character:
        // Consume the characters of the unparsed-attributes up to,
        // not including, the first %x3B (";") character.
        // ...
        stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
      }

      return document.cookie = key + '=' + value + stringifiedAttributes;
    }

    function get(key, json) {
      if (typeof document === 'undefined') {
        return;
      }

      var jar = {};
      // To prevent the for loop in the first place assign an empty array
      // in case there are no cookies at all.
      var cookies = document.cookie ? document.cookie.split('; ') : [];
      var i = 0;

      for (; i < cookies.length; i++) {
        var parts = cookies[i].split('=');
        var cookie = parts.slice(1).join('=');

        if (!json && cookie.charAt(0) === '"') {
          cookie = cookie.slice(1, -1);
        }

        try {
          var name = decode$1(parts[0]);
          cookie = (converter.read || converter)(cookie, name) || decode$1(cookie);

          if (json) {
            try {
              cookie = JSON.parse(cookie);
            } catch (e) {}
          }

          jar[name] = cookie;

          if (key === name) {
            break;
          }
        } catch (e) {}
      }

      return key ? jar[key] : jar;
    }

    api.set = set;
    api.get = function (key) {
      return get(key, false /* read as raw */);
    };
    api.getJSON = function (key) {
      return get(key, true /* read as json */);
    };
    api.remove = function (key, attributes) {
      set(key, '', extend$2(attributes, {
        expires: -1
      }));
    };

    api.defaults = {};

    api.withConverter = init;

    return api;
  }

  var Cookies = init(function () {});

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

    let i18n = new VueI18n(params);

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

  VueI18nStorge.install = VueI18n.install;

  const axios = require('axios');

  /**
   * Http 请求库构造函数
   * @param {配置项} params
   */
  function CreateService(params) {
    // 默认的函数
    const defaultConfig = {
      baseURL: process.env.VUE_APP_BASE_URL,
      headers: { Accept: 'application/json' },
      timeout: 60 * 1000
    };
    const options = Object.assign({}, defaultConfig, params);
    // 创建axios实例
    let service = axios.create({
      baseURL: options.baseURL, // 设置默认的BASE_URL
      headers: options.headers, // 数据格式 默认JSON
      withCredentials: options.withCredentials,
      timeout: options.timeout // 请求超时时间
    });

    // 请求前的拦截器
    service.interceptors.request.use(config => {
      if (options.requestConfigCallBack) {
        options.requestConfigCallBack(config);
      }
      return config;
    }, error => {
      // 执行请求前错误的回调函数
      if (options.requestErrorCallBack) {
        options.requestErrorCallBack(error);
      }
      Promise.reject(error);
    });

    // 响应前的拦截器
    service.interceptors.response.use(response => {
      if (options.responseConfigCallBack) {
        options.responseConfigCallBack(response);
      }
      return response;
    }, error => {
      if (options.responseErrorCallBack) {
        options.responseErrorCallBack(error);
      }
      return Promise.reject(error);
    });

    return service;
  }

  let defaultOptions = {
    mode: 'history',
    base: process.env.BASE_URL,
    record: true,
    breadcrumb: true,
    scrollBehavior: () => ({ y: 0 }),
    locale: 'zh-CN'
  };

  const params = Object.assign(defaultOptions, options);

  const request = new CreateService(params.httpConfig);

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
        modules: require.context('@/pages', true, /router\.js/),
        filter: params.filter,
        beforeEach: params.beforeEach,
        afterEach: params.afterEach
      });

      let store = new autoVuex({
        files: require.context('@/models', true, /\.js$/),
        pages: require.context('@/pages', true, /model\.js$/)
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

  exports.default = index;
  exports.request = request;

  Object.defineProperty(exports, '__esModule', { value: true });

});
