const React = window.__char_react;

if (!React || !window.__char_plugins) {
  throw new Error("Char plugin globals are unavailable");
}

function HelloWorldView() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="flex h-full items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">
          Hello from plugin
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          This tab is rendered from <code>examples/plugins/hello-world</code>.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
            onClick={() => setCount((value) => value + 1)}
            type="button"
          >
            Increment
          </button>
          <span className="text-sm text-neutral-500">Count: {count}</span>
        </div>
      </div>
    </div>
  );
}

window.__char_plugins.register({
  id: "hello-world",
  onload(ctx) {
    ctx.registerView("hello-world", () => <HelloWorldView />);
    ctx.openTab("hello-world");
  },
});
