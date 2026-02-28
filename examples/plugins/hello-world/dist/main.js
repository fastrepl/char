(() => {
  // src/main.tsx
  var React = window.__char_react;
  if (!React || !window.__char_plugins) {
    throw new Error("Char plugin globals are unavailable");
  }
  var lifecycleState = {
    status: "inactive",
    sessionId: null,
    eventCount: 0
  };
  var lifecycleSubscribers = /* @__PURE__ */ new Set();
  function emitLifecycleState() {
    for (const subscriber of lifecycleSubscribers) {
      subscriber(lifecycleState);
    }
  }
  function setLifecycleState(next) {
    lifecycleState = next;
    emitLifecycleState();
  }
  function subscribeLifecycleState(subscriber) {
    lifecycleSubscribers.add(subscriber);
    subscriber(lifecycleState);
    return () => {
      lifecycleSubscribers.delete(subscriber);
    };
  }
  function HelloWorldView() {
    const [count, setCount] = React.useState(0);
    const [lifecycle, setLifecycle] = React.useState(lifecycleState);
    React.useEffect(() => {
      return subscribeLifecycleState(setLifecycle);
    }, []);
    return /* @__PURE__ */ React.createElement("div", { className: "flex h-full items-center justify-center bg-neutral-50" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm" }, /* @__PURE__ */ React.createElement("h1", { className: "text-lg font-semibold text-neutral-900" }, "Hello from plugin"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-neutral-600" }, "This tab is rendered from ", /* @__PURE__ */ React.createElement("code", null, "examples/plugins/hello-world"), "."), /* @__PURE__ */ React.createElement("p", { className: "mt-4 text-sm text-neutral-700" }, "Listener lifecycle:", " ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, lifecycle.status)), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-neutral-500" }, "Session: ", lifecycle.sessionId ?? "none", " / Events seen:", " ", lifecycle.eventCount), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700",
        onClick: () => setCount((value) => value + 1),
        type: "button"
      },
      "Increment"
    ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-neutral-500" }, "Count: ", count))));
  }
  window.__char_plugins.register({
    id: "hello-world",
    onload(ctx) {
      ctx.registerEvent(
        ctx.events.tauri.listener.sessionLifecycleEvent.listen(({ payload }) => {
          setLifecycleState({
            status: payload.type,
            sessionId: payload.session_id,
            eventCount: lifecycleState.eventCount + 1
          });
        })
      );
      ctx.registerView("hello-world", () => /* @__PURE__ */ React.createElement(HelloWorldView, null));
      ctx.openTab("hello-world");
    }
  });
})();
//# sourceMappingURL=main.js.map
