import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4FB3A5',
          dark: '#3A9589',
          light: '#E8F5F3',
        },
        accent: {
          DEFAULT: '#6FA8DC',
          dark: '#378ADD',
          light: '#EBF3FB',
        },
        background: '#F7F9FA',
        card: '#FFFFFF',
        'text-main': '#2C3E50',
      },
    },
  },
  plugins: [],
};

export default config;
