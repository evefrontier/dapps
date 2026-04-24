/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "*",
    "./src/*.{js,ts,jsx,tsx}",
    "./src/*/*.{js,ts,jsx,tsx}",
    "../libs/ui-components/*/*.{js,ts,jsx,tsx}",
    "./node_modules/@eveworld/ui-components/*/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "lg:grid",
    "lg:grid-cols-8",
    "lg:col-span-3",
    "lg:col-span-5",
    "mx-4",
    "bg-neutral",
  ],
  theme: {},
};
