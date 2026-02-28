import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Char for Google Meet",
    description:
      "POC extension: Google Meet DOM parsing and native messaging bridge to Char desktop.",
    permissions: ["nativeMessaging"],
  },
});
