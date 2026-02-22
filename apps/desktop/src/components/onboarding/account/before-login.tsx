import { useEffect, useState } from "react";

import { useAuth } from "../../../auth";

export function BeforeLogin({
  onContinue: _onContinue,
}: {
  onContinue: () => void;
}) {
  const auth = useAuth();
  const triggered = useAutoTriggerSignin();
  const [showCallbackUrlInput, setShowCallbackUrlInput] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => auth?.signIn()}
          disabled={!triggered}
          className="px-5 py-2.5 rounded-full bg-stone-600 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99] w-fit"
        >
          {triggered
            ? "Click here to Sign in"
            : "Signing in on your browser..."}
        </button>
        {triggered && (
          <button
            className="text-sm text-neutral-500 hover:text-neutral-600 underline"
            onClick={() => setShowCallbackUrlInput(true)}
          >
            Something not working?
          </button>
        )}
      </div>
      {showCallbackUrlInput && <CallbackUrlInput />}
    </div>
  );
}

function CallbackUrlInput() {
  const auth = useAuth();

  const [callbackUrl, setCallbackUrl] = useState("");

  return (
    <div className="relative flex items-center border rounded-full overflow-hidden transition-all duration-200 border-neutral-200 focus-within:border-neutral-400">
      <input
        type="text"
        className="flex-1 px-4 py-3 text-xs font-mono outline-hidden bg-white"
        placeholder="char://...?access_token=..."
        value={callbackUrl}
        onChange={(e) => setCallbackUrl(e.target.value)}
      />
      <button
        onClick={() => auth?.handleAuthCallback(callbackUrl)}
        disabled={!callbackUrl}
        className="absolute right-0.5 px-4 py-2 text-sm bg-neutral-600 text-white rounded-full enabled:hover:scale-[1.02] enabled:active:scale-[0.98] transition-all disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}

function useAutoTriggerSignin() {
  const auth = useAuth();
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!triggered && auth) {
      setTriggered(true);
      auth.signIn();
    }
  }, [auth, triggered]);

  return triggered;
}
