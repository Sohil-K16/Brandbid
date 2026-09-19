import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DODO_PAYMENTS_API_KEY: "dodo_test_brandbid_local",
      DODO_PAYMENTS_PRODUCT_ID: "pdt_brandbid_spot",
      DODO_PAYMENTS_ENVIRONMENT: "test_mode",
      DODO_PAYMENTS_WEBHOOK_KEY: "whsec_dGVzdF93ZWJob29rX3NlY3JldF8xMjM0NTY3ODkwMTI=",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
