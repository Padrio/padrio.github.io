/** @type {import('tailwindcss').Config} */
export default {
  // Inert under Tailwind 4: the source set is declared as @source in
  // src/styles/global.css. Kept as documentation of the intent — widening this
  // glob alone has no effect and the build stays green.
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        content: '1120px',
      },
      animation: {
        caret: 'caret 1.2s step-end infinite',
      },
      keyframes: {
        caret: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
