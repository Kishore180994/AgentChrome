/** @type {import('tailwindcss').Config} */
export default {
  prefix: "d4m-",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false, // Disable Tailwind's global reset
  },
  plugins: [],
};
