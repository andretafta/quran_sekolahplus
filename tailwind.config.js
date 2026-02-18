// tailwind.config.js

module.exports = {
  // ...
  theme: {
    extend: {
      keyframes: {
        'pac-man': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fill-spin': {
          '0%': {
            'border-top-color': 'rgba(0,0,0,0)',
            'border-right-color': 'rgba(0,0,0,0)',
            'border-bottom-color': 'rgba(0,0,0,0)',
            'border-left-color': 'rgb(16, 185, 129)',
          }, // Tailwind: green-500
          '25%': {
            'border-top-color': 'rgb(16, 185, 129)',
            'border-right-color': 'rgba(0,0,0,0)',
            'border-bottom-color': 'rgba(0,0,0,0)',
            'border-left-color': 'rgb(16, 185, 129)',
          },
          '50%': {
            'border-top-color': 'rgb(16, 185, 129)',
            'border-right-color': 'rgb(16, 185, 129)',
            'border-bottom-color': 'rgba(0,0,0,0)',
            'border-left-color': 'rgb(16, 185, 129)',
          },
          '75%': {
            'border-top-color': 'rgb(16, 185, 129)',
            'border-right-color': 'rgb(16, 185, 129)',
            'border-bottom-color': 'rgb(16, 185, 129)',
            'border-left-color': 'rgb(16, 185, 129)',
          },
          '100%': {
            'border-top-color': 'rgb(16, 185, 129)',
            'border-right-color': 'rgb(16, 185, 129)',
            'border-bottom-color': 'rgb(16, 185, 129)',
            'border-left-color': 'rgb(16, 185, 129)',
          },
        },
      },
      animation: {
        'pac-man': 'pac-man 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
        'fill-spin': 'fill-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
      },
    },
  },
  plugins: [],
};
