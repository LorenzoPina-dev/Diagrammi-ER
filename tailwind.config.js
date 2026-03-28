/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#0f172a',
          grid: '#1e293b',
        },
        entity: {
          fill: '#1e3a5f',
          stroke: '#3b82f6',
          text: '#e2e8f0',
          selected: '#60a5fa',
        },
        relation: {
          fill: '#3b1f5e',
          stroke: '#a855f7',
          text: '#e2e8f0',
          selected: '#c084fc',
        },
        attribute: {
          fill: '#1a2e1a',
          stroke: '#22c55e',
          pkFill: '#14532d',
          pkStroke: '#16a34a',
          optionalStroke: '#6b7280',
        },
        sidebar: {
          bg: '#111827',
          border: '#1f2937',
          input: '#1f2937',
        }
      }
    },
  },
  plugins: [],
}
