/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '380px'
      },
      colors: {
        canvas: '#060910',
        panel: '#0C1220',
        elevated: '#101B2D',
        accent: {
          DEFAULT: '#32DFFF',
          dim: 'rgba(50, 223, 255, 0.12)',
          secondary: '#668CFF'
        },
        ink: {
          DEFAULT: '#EDF5FF',
          muted: '#8D9DB8'
        },
        line: 'rgba(141, 157, 184, 0.18)',
        ok: '#54E6B0',
        warn: '#FBBF24',
        danger: '#F87171'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(50, 223, 255, 0.22), 0 0 24px rgba(50, 223, 255, 0.08)',
        panel: '0 0 0 1px rgba(141, 157, 184, 0.14)'
      },
      transitionDuration: {
        180: '180ms'
      }
    }
  },
  plugins: []
};
