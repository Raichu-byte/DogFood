/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          black: '#090909',
          'black-2': '#0d0d0d',
          'black-3': '#121212',
          white: '#f1f0ed',
          'white-soft': '#c8c6c3',
          line: '#3a393b',
          'line-soft': '#242326',
          'line-bright': '#5c5960',
          purple: '#a98be8',
          'purple-soft': 'rgba(169, 139, 232, 0.30)',
          'purple-faint': 'rgba(169, 139, 232, 0.12)',
          green: '#9eea9a',
          'green-soft': 'rgba(158, 234, 154, 0.20)',
          button: '#bca1ee',
          'button-text': '#161218',
        },
      },
      fontFamily: {
        headline: [
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"IBM Plex Mono"',
          '"SFMono-Regular"',
          'Consolas',
          'Menlo',
          'Monaco',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
