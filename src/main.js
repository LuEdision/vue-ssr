import Vue from 'vue';
import { sync } from 'vuex-router-sync';
import VueMeta from 'vue-meta';
import App from './App.vue';
import { createRouter } from './router';
import { createStore } from './store';

Vue.config.productionTip = false;
Vue.use(VueMeta);

// 自定义 meta 显示模板
Vue.mixin({
  metaInfo: {
    titleTemplate: '%s | vue-ssr-website',
    title: 'vue-ssr-website',
    BASE_URL: '/',
    htmlAttrs: {
      lang: 'es',
    },
    noscript: [
      {
        body: true,
        innerHTML:
          // eslint-disable-next-line quotes
          "<strong>We're sorry but vue-ssr-website doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>",
      },
    ],
  },
});

export const createApp = () => {
  const router = createRouter();
  const store = createStore();
  const unsync = sync(store, router); // 返回值是 unsync 回调方法

  // 在 Vue 应用销毁时 (比如在仅部分场景使用 Vue 的应用中跳出该场景且希望销毁 Vue 的组件/资源时）
  // unsync() // 取消 store 和 router 中间的同步
  const app = new Vue({
    router,
    store,
    render: (h) => h(App),
  });
  return { app, router, store };
};

export default () => {
  const router = createRouter();
  const store = createStore();
  const unsync = sync(store, router); // 返回值是 unsync 回调方法

  // 在 Vue 应用销毁时 (比如在仅部分场景使用 Vue 的应用中跳出该场景且希望销毁 Vue 的组件/资源时）
  // unsync() // 取消 store 和 router 中间的同步
  const app = new Vue({
    router,
    store,
    render: (h) => h(App),
  });
  return { app, router, store };
};
