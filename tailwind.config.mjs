/** @type {import('tailwindcss').Config} */
export default {
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
        'pulse-dot': 'pulseDot 2.4s infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.45)' },
          '70%': { boxShadow: '0 0 0 7px rgba(16,185,129,0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
