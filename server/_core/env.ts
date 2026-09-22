// No cloud credentials are required. The model endpoint + key live in the
// browser (Settings > Assistant providers). This file is intentionally minimal.
export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
};
