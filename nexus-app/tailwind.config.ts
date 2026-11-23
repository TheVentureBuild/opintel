import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      boxShadow: {
        soft: "var(--shadow-soft)",
        // Huntlyst (/huntylst) sketch shadows
        sketch: "2px 3px 0px #2C2724",
        "sketch-lg": "4px 5px 0px #2C2724",
        "sketch-hover": "3px 4px 0px #2C2724",
        "sketch-orange": "3px 4px 0px #FF6B35",
        "sketch-inner": "inset 1px 2px 0px rgba(44, 39, 36, 0.1)",
      },
      opacity: { "8": "0.08", "12": "0.12" },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        hand: ['Patrick Hand', 'Caveat', 'Kalam', 'cursive', 'sans-serif'],
      },
      colors: {
        // Huntlyst (/huntylst) palette, used only inside .huntylst-root
        paper: { bg: '#FAF6EE', card: '#FFFDF9', border: '#2C2724', subtle: '#F0EAD8', hover: '#F5EFE0' },
        tvb: {
          orange: '#FF6B35', 'orange-hover': '#F05820', peach: '#FFE7DC', 'peach-light': '#FFF3ED',
          ink: '#1E1B18', 'ink-light': '#5A544E', 'ink-muted': '#8C847A',
          green: '#1E7E34', 'green-bg': '#EAF6EC', amber: '#B27B00', 'amber-bg': '#FEF3D6',
        },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        hero: {
          DEFAULT: "hsl(var(--hero-bg))",
          foreground: "hsl(var(--hero-foreground))",
        },
        stat: {
          DEFAULT: "hsl(var(--stat-bg))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Scoped-theme tokens (values injected by .theme-ai-orbit / .theme-travel-orbit)
        obsidian: "hsl(var(--obsidian, var(--background)))",
        platinum: "hsl(var(--platinum, var(--foreground)))",
        "midnight-deep": "hsl(var(--midnight-deep, var(--background)))",
        gold: {
          DEFAULT: "hsl(var(--gold, var(--primary)))",
          light: "hsl(var(--gold-light, var(--primary)))",
          muted: "hsl(var(--gold-muted, var(--muted-foreground)))",
        },
        "surface-light": {
          DEFAULT: "hsl(var(--surface-light, var(--secondary)))",
          foreground: "hsl(var(--surface-light-foreground, var(--secondary-foreground)))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "16px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "marquee-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-right": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-up-delay-1": "fade-up 0.7s ease-out 0.15s forwards",
        "fade-up-delay-2": "fade-up 0.7s ease-out 0.3s forwards",
        "fade-up-delay-3": "fade-up 0.7s ease-out 0.45s forwards",
        "float": "float 6s ease-in-out infinite",
        "marquee-left": "marquee-left linear infinite",
        "marquee-right": "marquee-right linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-slow": "pulse-slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
