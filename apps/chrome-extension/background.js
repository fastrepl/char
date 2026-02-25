const HOST_NAME = "com.hyprnote.chrome";
let port = null;

function connect() {
  try {
    port = chrome.runtime.connectNative(HOST_NAME);

    port.onDisconnect.addListener(() => {
      port = null;
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
      setTimeout(connect, 5000);
    });

    chrome.action.setBadgeText({ text: "" });
  } catch {
    port = null;
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
    setTimeout(connect, 5000);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (port) {
    port.postMessage(message);
  }
});

chrome.runtime.onInstalled.addListener(() => connect());
chrome.runtime.onStartup.addListener(() => connect());
