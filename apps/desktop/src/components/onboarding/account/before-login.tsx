import { useEffect, useState } from "react";

import { useAuth } from "../../../auth";
import { OnboardingButton } from "../shared";

export function BeforeLogin({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <SigninButton />
      <ControlRegion handleContinue={onContinue} />
    </div>
  );
}

function SigninButton() {
  const auth = useAuth();

  const triggered = useAutoTriggerSignin();

  return (
    <OnboardingButton onClick={() => auth?.signIn()} disabled={triggered}>
      {triggered ? "Click here to Sign in" : "Signing in on your browser..."}
    </OnboardingButton>
  );
}

function ControlRegion(_: { handleContinue: () => void }) {
  const auth = useAuth();
  const [showCallbackUrlInput, setShowCallbackUrlInput] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {showCallbackUrlInput ? <CallbackUrlInput /> : null}

      <div className="flex flex-row gap-2 items-center mx-auto">
        <button
          className="text-sm text-neutral-500 hover:text-neutral-600 underline"
          onClick={() => auth?.signIn()}
        >
          Browser not opened?
        </button>

        <span className="text-sm text-neutral-400 mx-1">/</span>
        <button
          className="text-sm text-neutral-500 hover:text-neutral-600 underline"
          onClick={(_v) => setShowCallbackUrlInput(true)}
        >
          Deeplink not working?
        </button>
        {/* <span className="text-sm text-neutral-600">or </span>
        <button
          className="text-sm text-neutral-400 hover:text-neutral-600 underline"
          onClick={() => handleContinue()}
        >
          continue without account.
        </button> */}
      </div>
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
