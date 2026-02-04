/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				primary: '#0B0F14',
				secondary: '#0F141A',
				card: '#131A24',
				'text-primary': '#F5F7FA',
				'text-secondary': '#9AA4B2',
				'accent-green': '#21E786',
				'accent-red': '#EF4444',
				'accent-blue': '#60A5FA',
				border: '#1D2633',
				surface: '#101722',
			},
			fontFamily: {
				sans: ['IBM Plex Sans', 'sans-serif'],
				display: ['Space Grotesk', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
			fontSize: {
				'display': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
				'headline': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
			},
			animation: {
				'fadeIn': 'fadeIn 0.6s ease-out',
				'fadeInUp': 'fadeInUp 0.6s ease-out',
				'fadeInDown': 'fadeInDown 0.6s ease-out',
				'slideInLeft': 'slideInLeft 0.6s ease-out',
				'slideInRight': 'slideInRight 0.6s ease-out',
				'scaleIn': 'scaleIn 0.6s ease-out',
				'float': 'float 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
			},
			keyframes: {
				fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
				fadeInUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
				fadeInDown: { from: { opacity: '0', transform: 'translateY(-20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
				slideInLeft: { from: { opacity: '0', transform: 'translateX(-30px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
				slideInRight: { from: { opacity: '0', transform: 'translateX(30px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
				scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
				float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
				shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
				'glow-pulse': { '0%, 100%': { boxShadow: '0 0 20px rgba(34,197,94,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(34,197,94,0.5)' } },
			},
			boxShadow: {
				'glow-green': '0 0 24px rgba(33,231,134,0.35)',
				'glow-red': '0 0 24px rgba(239,68,68,0.3)',
				'glow-blue': '0 0 24px rgba(96,165,250,0.3)',
				'elevated': '0 10px 40px -10px rgba(0,0,0,0.7)',
			},
		},
	},
	plugins: [],
}
