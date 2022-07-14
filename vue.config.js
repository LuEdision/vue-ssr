const path = require('path');
const { defineConfig } = require('@vue/cli-service');
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

//环境变量，决定入口是客户端还是服务端
const TARGRT_NODE = process.env.WEBPACK_TARGET === 'node';
const target = TARGRT_NODE ? 'server' : 'client';
function addStyleResource(rule) {
  rule
    .use('style-resource')
    .loader('style-resources-loader')
    .options({
      patterns: [path.resolve(__dirname, './src/assets/styles/variables.scss')],
    });
}
module.exports = defineConfig({
  devServer: {
    host: 'localhost',
    port: 8000,
    open: true,
    proxy: {
      '/api': {
        target: 'https://other-server.example.com',
        secure: false,
        changeOrigin: true,
        bypass: function (req, res, proxyOptions) {
          if (req.headers.accept.indexOf('html') !== -1) {
            console.log('Skipping proxy for browser request.');
            return '/index.html';
          }
        },
      },
    },
  },
  transpileDependencies: true,
  css: {
    extract: process.env.NODE_ENV === 'production' ? true : false,
    loaderOptions: {
      css: {
        // Vue CLI v3 用户可参考 css-loader v1 文档
        // https://github.com/webpack-contrib/css-loader/tree/v1.0.1
        modules: {
          localIdentName: '[name]-[hash]',
          exportLocalsConvention: 'camelCaseOnly',
        },
      },
      // 给 sass-loader 传递选项
      sass: {
        // @/ 是 src/ 的别名
        // 所以这里假设你有 `src/variables.sass` 这个文件
        // 注意：在 sass-loader v8 中，这个选项名是 "prependData"
        // additionalData: '@import "~@/variables.sass"',
      },
      // 默认情况下 `sass` 选项会同时对 `sass` 和 `scss` 语法同时生效
      // 因为 `scss` 语法在内部也是由 sass-loader 处理的
      // 但是在配置 `prependData` 选项的时候
      // `scss` 语法会要求语句结尾必须有分号，`sass` 则要求必须没有分号
      // 在这种情况下，我们可以使用 `scss` 选项，对 `scss` 语法进行单独配置
      scss: {
        additionalData: '@import "~@/assets/styles/variables.scss";',
      },
      // 给 less-loader 传递 Less.js 相关选项
      less: {
        // http://lesscss.org/usage/#less-options-strict-units `Global Variables`
        // `primary` is global variables fields name
        globalVars: {
          primary: '#fff',
        },
      },
      postcss: {
        postcssOptions: {
          plugins: [],
        },
      },
    },
  },
  // publicPath: '/',
  outputDir: './dist/' + target,
  chainWebpack: (config) => {
    const types = ['vue-modules', 'vue', 'normal-modules', 'normal'];
    types.forEach((type) =>
      addStyleResource(config.module.rule('sass').oneOf(type))
    );
    config.module
      .rule('vue')
      .test(/\.vue$/) // 匹配.vue文件
      .use('vue-loader')
      .tap((options) => {
        // 修改它的选项...
        return options;
      });
    config.module
      .rule('images')
      .test(/\.(png|jpe?g|gif|svg|webp)(\?.*)?$/) // 匹配png|jpe?g|gif|svg文件
      .use('url-loader')
      .loader('url-loader')
      .tap((options) => {
        // 修改它的选项...
        let opts = options ? options : {};
        opts = Object.assign(opts, {
          limit: 1024 * 4,
          name: '[name].[hash:7].[ext]',
        });

        return opts;
      });
    config.plugin('html').tap((args) => {
      args[0].title = 'vue2-ssr-website';
      args[0].template = './public/index.html';
      args[0].filename = 'index.html';
      args[0].templateParameters = {
        BASE_URL: '/',
      };
      args[0].hash = true;
      args[0].inject = true;
      return args;
    });
    config.module.rule('vue').uses.delete('cache-loader');
    config.module.rule('js').uses.delete('cache-loader');
    config.module.rule('jsx').uses.delete('cache-loader');
    config.module.rule('ts').uses.delete('cache-loader');
    config.module.rule('tsx').uses.delete('cache-loader');
    // if (!process.env.SSR) {
    //   // workbox-webpack-plugin 插件配置
    //   config.entry('app').clear().add('./src/client/index.js');
    //   return;
    // }

    // Point entry to your app's server entry file
    // config.entry('app').clear().add('./src/server/index.js');
    config.plugins.delete('preload');
    config.plugins.delete('prefetch');
    config.plugins.delete('progress');
    config.plugins.delete('friendly-errors');
  },
  configureWebpack: () => ({
    mode: process.env.NODE_ENV ?? 'development',
    resolve: {
      extensions: ['.js', '.vue', '.json', '.css', '.scss'], // 后缀名省略配置
      alias: {
        '@': path.resolve('./src'), // 默认配置了
        common: '@/common',
        assets: '@/assets',
        components: '@/components',
        network: '@/network',
        views: '@/views',
      },
    },
    //将 entry 指向应用程序的 server entry 文件
    entry: `./src/${target}/index.js`,
    //对 bundle renderer 提供 source map 支持
    devtool: 'source-map',
    //这允许 webpack 以 Node 适用方式(Node-appropriate fashion)处理动态导入(dynamic import)
    //并且还会在编译 Vue 组件时，告知 `vue-loader` 输送面向服务器代码(server-oriented code)
    target: TARGRT_NODE ? 'node' : 'web',
    node: TARGRT_NODE ? undefined : false,
    output: {
      //此处告知 server bundle 使用 Node 风格导出模块(Node-style exports)
      filename: '[name].[chunkhash].js',
      libraryTarget: TARGRT_NODE ? 'commonjs2' : undefined,
    },
    externals: [
      {
        // Object
        lodash: {
          commonjs: 'lodash',
          commonjs2: 'lodash',
          amd: 'lodash',
          root: '_', // indicates global variable
        },
      },
    ],
    optimization: { splitChunks: TARGRT_NODE ? false : undefined },
    //将服务器的整个输出构建为单个 JOSN 文件的插件
    //服务端默认文件名为 vue-ssr-server-bundle.json
    plugins: [
      TARGRT_NODE ? new VueSSRServerPlugin() : new VueSSRClientPlugin(),
      // new VueLoaderPlugin(),
      // new HtmlWebpackPlugin({
      //   templateParameters: {
      //     BASE_URL: '/dist/',
      //   },
      //   template: './public/index.template.html',
      //   hash: true,
      //   inject: true,
      // }),
    ],
  }),
});
