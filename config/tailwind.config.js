import colors from 'tailwindcss/colors';

export default {
  content: ['../index.html', '../src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      ...colors,
    },
    extend: {},
  },
  plugins: [],
};
