const axios = require('axios')

/**
 * Http 请求库构造函数
 * @param {配置项} params
 */
function CreateService (params) {
  // 默认的函数
  const defaultConfig = {
    baseURL: process.env.VUE_APP_BASE_URL,
    headers: { Accept: 'application/json' },
    timeout: 60 * 1000
  }
  const options = Object.assign({}, defaultConfig, params)
  // 创建axios实例
  let service = axios.create({
    baseURL: options.baseURL, // 设置默认的BASE_URL
    headers: options.headers, // 数据格式 默认JSON
    withCredentials: options.withCredentials,
    timeout: options.timeout // 请求超时时间
  })

  // 请求前的拦截器
  service.interceptors.request.use(
    config => {
      if (options.requestConfigCallBack) {
        options.requestConfigCallBack(config)
      }
      return config
    },
    error => {
      // 执行请求前错误的回调函数
      if (options.requestErrorCallBack) {
        options.requestErrorCallBack(error)
      }
      Promise.reject(error)
    }
  )

  // 响应前的拦截器
  service.interceptors.response.use(
    response => {
      if (options.responseConfigCallBack) {
        options.responseConfigCallBack(response)
      }
      return response
    },
    error => {
      if (options.responseErrorCallBack) {
        options.responseErrorCallBack(error)
      }
      return Promise.reject(error)
    }
  )

  return service
}

export default CreateService
