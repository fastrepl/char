import { useAuth } from "../../../auth";
import { AfterLogin } from "./after-login";
import { BeforeLogin } from "./before-login";

export function LoginSection({ onContinue }: { onContinue: () => void }) {
  const auth = useAuth();

  if (auth?.session) {
    return <AfterLogin onContinue={onContinue} />;
  }

  return <BeforeLogin onContinue={onContinue} />;
}
