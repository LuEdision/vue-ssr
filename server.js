//nodejs服务器
const express = require('express');
const fs = require('fs');
const path = require('path');

//创建express实例
const app = express();
//创建渲染器
const { createBundleRenderer, createRenderer } = require('vue-server-renderer');
// 加载模块处理函数
const setupDevServer = require('./src/server/setup-dev-server');
const serverBundle = require('./dist/server/vue-ssr-server-bundle.json');
const clientManifest = require('./dist/client/vue-ssr-client-manifest.json');
const { devServer } = require('./vue.config.js');

const { host, port } = devServer;

// 判断当前是否是生产环境
const isProd = process.env.NODE_ENV === 'production';
let renderer, onReady;
// if (!isProd) {
// 生产环境打包--按照之前的处理逻辑
// 加载通过 webpack 打包好的 vue-ssr-server-bundle.json 文件
// const serverBundle = require('./dist/server/vue-ssr-server-bundle.json');
// 加载通过 webpack 打包好的 vue-ssr-client-bundle.json 文件
// const clientManifest = require('./dist/client/vue-ssr-client-manifest.json');
// fs 模块读取得到的 buffer 二进制流，需要转换为字符串
const template = fs.readFileSync('./public/index.template.html', 'utf-8');

renderer = createBundleRenderer(serverBundle, {
  template, // （可选）页面模板
  runInNewContext: false, // 推荐
  clientManifest, // （可选）客户端构建 manifest
});
// } else {
//   // 开发环境打包
//   // 监视打包构建 -> 重新生成 renderer 渲染器
//   onReady = setupDevServer(app, (serverBundle, template, clientManifest) => {
//     // 监视打包构建 之后执行回调函数
//     // 基于打包构建后的结果，重新生成 renderer 渲染器
//     renderer = createBundleRenderer(serverBundle, {
//       template, // （可选）页面模板
//       runInNewContext: false, // 推荐
//       clientManifest, // （可选）客户端构建 manifest
//     });
//   });
// }

let dirs = [];
const pathName = path.join(__dirname, './dist/client');
const files = fs.readdirSync(pathName);
for (let file of files) {
  const stat = fs.statSync(path.join(pathName, file));
  if (stat.isFile()) {
    dirs.push(file);
  }
}
const reg = /workbox-.*\.js$/gi;
const workboxFile = dirs.find((file) => {
  return reg.test(file);
});

const render = async (req, res) => {
  try {
    const context = {
      url: req.url,
      title: 'vue-ssr-website',
    };

    //````````````渲染一个string类型的Vue实例（内容少时）````````````````
    // const html = await renderer.renderToString(context);
    // res.end(html); // or res.send(html);
    //````````````渲染一个流模式的Vue实例（内容多时）````````````````````
    const ssrStream = await renderer.renderToStream(context);
    const buffers = [];
    ssrStream.on('data', (data) => {
      buffers.push(data);
    });
    ssrStream.on('error', (error) => {
      console.log('stream-error', error);
    });
    ssrStream.on('end', () => {
      console.log('stream-end');
      res.end(Buffer.concat(buffers));
    });
  } catch (err) {
    console.log('error-capture', err);
    res.status(500).send('Internal Server Error');
  }
};

//中间件处理静态文件请求
app.use(express.static('./dist/client', { index: false }));
app.use('/img', express.static(path.join(__dirname, './dist/client')));
app.use('/js', express.static(path.join(__dirname, './dist/client', 'js')));
app.use('/css', express.static(path.join(__dirname, './dist/client', 'css')));
app.use(
  '/service-worker.js',
  express.static(path.join(__dirname, './dist/client', 'service-worker.js'))
);
app.use(
  `/${workboxFile ? workboxFile : 'workbox-2d118ab0.js'}`,
  express.static(
    path.join(
      __dirname,
      './dist/client',
      workboxFile ? workboxFile : 'workbox-2d118ab0.js'
    )
  )
);
app.use(
  '/favicon.ico',
  express.static(path.join(__dirname, './dist/client', 'favicon.ico'))
);

// 在请求根路径的时候，我们将渲染好的 vue-ssr 发送给客户端浏览器
app.get('*', render);
// app.get(
//   '*',
//   isProd
//     ? render
//     : async (req, res) => {
//         await onReady;
//         // 等待有了 renderer 渲染器以后，调用 render 进行渲染
//         render(req, res);
//       }
// );
app.listen(port, host, () => {
  console.log(`Server render address http://${host}:${port}`);
});
