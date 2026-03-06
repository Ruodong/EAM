import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'lenovo-red': '#E2231A',
        'lenovo-red-dark': '#C41E17',
        'primary-blue': '#4096FF',
        'primary-blue-hover': '#1677FF',
        'status-completed': '#52C41A',
        'status-in-progress': '#FA8C16',
        'status-submitted': '#1890FF',
        'status-draft': '#8C8C8C',
        'status-accepted': '#722ED1',
        'border-light': '#F0F0F0',
        'bg-gray': '#FAFAFA',
        'text-primary': '#262626',
        'text-secondary': '#8C8C8C',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
      width: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
};

export default config;
