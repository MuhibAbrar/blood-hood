import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  safelist: [
    // Blood group button colors — dynamic classes, must not be purged
    'bg-red-500', 'bg-red-600',
    'bg-blue-500', 'bg-blue-600',
    'bg-purple-500', 'bg-purple-700',
    'bg-rose-500', 'bg-rose-800',
    'text-white',
  ],
  plugins: [],
};
export default config;
