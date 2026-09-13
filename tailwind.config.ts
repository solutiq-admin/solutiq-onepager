import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        navy: '#161B35',
        productdark: '#211F27',
        gold: '#F9B630',
        silver: '#B3AFAE',
        white: '#FFFFFF',
      },
    },
  },
  plugins: [],
}

export default config
