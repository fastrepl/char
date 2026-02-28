(function () {
  const React = window.__char_react;
  const registry = window.__char_plugins;

  if (!React || !registry) {
    throw new Error("Char plugin globals are unavailable");
  }

  function HelloWorldView() {
    const [count, setCount] = React.useState(0);

    return React.createElement(
      "div",
      { className: "flex h-full items-center justify-center bg-neutral-50" },
      React.createElement(
        "div",
        {
          className:
            "w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm",
        },
        React.createElement(
          "h1",
          { className: "text-lg font-semibold text-neutral-900" },
          "Hello from plugin",
        ),
        React.createElement(
          "p",
          { className: "mt-2 text-sm text-neutral-600" },
          "This tab is rendered from ",
          React.createElement("code", null, "examples/plugins/hello-world"),
          ".",
        ),
        React.createElement(
          "div",
          { className: "mt-4 flex items-center gap-3" },
          React.createElement(
            "button",
            {
              className:
                "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700",
              onClick: function () {
                setCount(function (value) {
                  return value + 1;
                });
              },
              type: "button",
            },
            "Increment",
          ),
          React.createElement(
            "span",
            { className: "text-sm text-neutral-500" },
            "Count: ",
            count,
          ),
        ),
      ),
    );
  }

  registry.register({
    id: "hello-world",
    onload: function (ctx) {
      ctx.registerView("hello-world", function () {
        return React.createElement(HelloWorldView);
      });
      ctx.openTab("hello-world");
    },
  });
})();
