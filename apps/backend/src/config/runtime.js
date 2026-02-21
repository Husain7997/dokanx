const isTest = process.env.NODE_ENV === 'test'
const isProd = process.env.NODE_ENV === 'production'
const isDev  = !isTest && !isProd

module.exports = {
  isTest,
  isProd,
  isDev,
   isRuntime: !isTest,
}
