import { ConfigureProviders } from "./configure";
import { SttSettingsProvider } from "./context";
import { SelectProviderAndModel } from "./select";

export function STT() {
  return (
    <SttSettingsProvider>
      <div className="flex flex-col gap-6 mt-4">
        <SelectProviderAndModel />
        <ConfigureProviders />
      </div>
    </SttSettingsProvider>
  );
}
