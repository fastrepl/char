(() => {
  let lastState = null;

  function getMuteState() {
    const btn = document.querySelector("[data-is-muted]");
    if (btn) {
      return btn.getAttribute("data-is-muted") === "true";
    }

    const muteBtn = document.querySelector(
      'button[aria-label*="microphone" i], button[aria-label*="mic" i]',
    );
    if (muteBtn) {
      const label = muteBtn.getAttribute("aria-label") || "";
      if (/unmute|turn on/i.test(label)) return true;
      if (/mute|turn off/i.test(label)) return false;
    }
    return null;
  }

  function getParticipants() {
    const participants = [];

    const nameElements = document.querySelectorAll(
      "[data-self-name], [data-participant-id]",
    );
    nameElements.forEach((el) => {
      const name = el.textContent?.trim();
      if (name) {
        participants.push({
          name,
          is_self: el.hasAttribute("data-self-name"),
        });
      }
    });

    return participants;
  }

  function sendState() {
    const muted = getMuteState();
    if (muted === null) return;

    const state = {
      type: "meeting_state",
      url: window.location.href,
      is_active: true,
      muted,
      participants: getParticipants(),
    };

    const stateStr = JSON.stringify(state);
    if (stateStr === lastState) return;
    lastState = stateStr;

    chrome.runtime.sendMessage(state);
  }

  const observer = new MutationObserver(() => sendState());

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-is-muted", "aria-label"],
    subtree: true,
    childList: true,
  });

  sendState();

  window.addEventListener("beforeunload", () => {
    chrome.runtime.sendMessage({
      type: "meeting_ended",
      url: window.location.href,
      is_active: false,
    });
  });
})();
