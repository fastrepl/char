import { useEffect, useState } from "react";
import { useAuth } from "~/auth";
import { OnboardingButton } from "../shared";

export function BeforeLogin() {
  const auth = useAuth();
  const autoSignInCompleted = useAutoTriggerSignin();
  const [showCallbackUrlInput, setShowCallbackUrlInput] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <OnboardingButton
          onClick={() => auth?.signIn()}
          disabled={!autoSignInCompleted}
        >
          {autoSignInCompleted
            ? "Click here to Sign in"
            : "Signing in on your browser..."}
        </OnboardingButton>
        {autoSignInCompleted && (
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
        placeholder="Paste browser url here, after you've signed in. (Like: http://char.com/callback/auth/?flow=desktop&scheme=hyprnote&access_token=<V>&refresh_token=<V>)"
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
