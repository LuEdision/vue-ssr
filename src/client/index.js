import { createApp } from '../main';
import { registerServiceWorker } from '../registerServiceWorker';

// registerServiceWorker();
const { app, router, store } = createApp();
// 当使用 template 时，context.state 将作为 window.__INITIAL_STATE__ 状态，自动嵌入到最终的 HTML 中。
// 而在客户端，在挂载到应用程序之前，store 就应该获取到状态：
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
}
router.onReady(() => {
  //挂载激活app
  app.$mount('#app');
});
