import { createApp } from '../main';

//context就是地址
export default async (context) => {
  const { app, router, store } = createApp();
  const meta = app.$meta();
  //渲染首屏
  router.push(context.url);
  context.meta = meta;
  await new Promise(router.onReady.bind(router));
  // 在所有预取钩子(preFetch hook) resolve 后，
  // 我们的 store 现在已经填充入渲染应用程序所需的状态。
  // 当我们将状态附加到上下文，并且 `template` 选项用于 renderer 时，
  // 状态将自动序列化为 `window.__INITIAL_STATE__`，并注入 HTML。
  context.state = store.state;
  return app;
};
