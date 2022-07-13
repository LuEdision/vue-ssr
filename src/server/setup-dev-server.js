const fs = require('fs');
const path = require('path');
// 加载第三方模块，用来监视文件变化
const chokidar = require('chokidar');
const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
// 关于 webpack5 热更新这么配置会有问题
const hotMiddleware = require('webpack-hot-middleware');
// 自己封装一个 resolve 方法
const resolve = (file) => {
  return path.resolve(__dirname, file);
};

module.exports = (server, callback) => {
  let ready;
  const onReady = new Promise((r) => (ready = r));
  // 处理逻辑---监视构建，更新 renderer
  let serverBundle, template, clientManifest;
  const update = () => {
    if (serverBundle && template && clientManifest) {
      ready();
      callback(serverBundle, template, clientManifest);
    }
  };
  // 监视构建 template => 调用 update 函数 => 更新 renderer 渲染器
  const templatePath = resolve('../../public/index.template.html');
  template = fs.readFileSync(templatePath, 'utf-8');
  update();
  // console.log(template)
  // 监听 template 的变化 推荐使用第三方包 chokidar 封装了 fs.watch 和 fs.watchFile
  chokidar.watch(templatePath).on('change', () => {
    template = fs.readFileSync(templatePath, 'utf-8');
    update();
  });

  // 监视构建 serverBundle => 调用 update 函数 => 更新 renderer 渲染器
  const serverConfig = require('../../vue.config.js');
  console.log('serverConfig', serverConfig.configureWebpack);
  const execConfigureWebpack = (config) => {
    return serverConfig.configureWebpack(config);
  };
  const config = execConfigureWebpack();
  console.log('execConfigureWebpack', config);
  const serverCompiler = webpack(config);
  // 使用 中间件 文件保存在内存中---不再向物理磁盘读写数据
  const serverDevMiddleware = devMiddleware(serverCompiler, {});
  serverCompiler.hooks.done.tap('server', () => {
    const serverBundleStr =
      serverDevMiddleware.context.outputFileSystem.readFileSync(
        resolve('../../dist/server/vue-ssr-server-bundle.json'),
        'utf-8'
      );
    serverBundle = JSON.parse(serverBundleStr);
    update();
  });
  // 监视构建 clientManifest => 调用 update 函数 => 更新 renderer 渲染器
  config.plugins.push(new webpack.HotModuleReplacementPlugin());
  // api 的问题，为什么要用 clientConfig.entry.api
  config.entry.app = [
    'webpack-hot-middleware/client?quiet=true&reload=true',
    config.entry.app,
  ];
  const clientCompiler = webpack(config);
  // 使用 中间件 文件保存在内存中---不再向物理磁盘读写数据
  const clientDevMiddleware = devMiddleware(clientCompiler, {});
  clientCompiler.hooks.done.tap('client', () => {
    const clientManifestStr =
      clientDevMiddleware.context.outputFileSystem.readFileSync(
        resolve('../../dist/client/vue-ssr-client-manifest.json'),
        'utf-8'
      );
    clientManifest = JSON.parse(clientManifestStr);
    // console.log(clientManifest)
    update();
  });
  server.use(
    hotMiddleware(clientCompiler, {
      log: false, // 关闭它本身的日志输出
    })
  );
  // 将 clientDevMiddleware 挂载到 express 服务器上 提供对内存中数据的访问
  server.use(clientDevMiddleware);

  return onReady;
};
