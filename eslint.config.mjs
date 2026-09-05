import next from "eslint-config-next";

/**
 * eslint-config-next 16 ships a flat config directly, and `next lint` was
 * removed in Next 16, so `npm run lint` calls eslint itself.
 *
 * tools/ is Python and assets/ is binary, so neither is linted.
 */
const config = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "tools/**", "assets/**"],
  },
];

export default config;
