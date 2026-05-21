import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        tier: {
          austral: "#B87333",
          archipielago: "#C0C0C0",
          patagonia: "#FFD700",
          elite: "#E5E4E2",
        },
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        // Brand dynamic colors (injected via CSS variables)
        brand: {
          primary: "var(--brand-primary, #4b0082)",
          accent: "var(--brand-accent, #FFD100)",
          50: "var(--brand-50, #f2e6ff)",
          100: "var(--brand-100, #d9b3ff)",
          200: "var(--brand-200, #bf80ff)",
          300: "var(--brand-300, #a64dff)",
          400: "var(--brand-400, #8c1aff)",
          500: "var(--brand-500, #4b0082)",
          600: "var(--brand-600, #5c00a3)",
          700: "var(--brand-700, #400073)",
          800: "var(--brand-800, #25004a)",
          900: "var(--brand-900, #15002b)",
          "accent-50": "var(--brand-accent-50, #fffde6)",
          "accent-100": "var(--brand-accent-100, #fff9b3)",
          "accent-200": "var(--brand-accent-200, #fff580)",
          "accent-300": "var(--brand-accent-300, #fff14d)",
          "accent-400": "var(--brand-accent-400, #ffed1a)",
          "accent-500": "var(--brand-accent-500, #ffd100)",
          "accent-600": "var(--brand-accent-600, #cca800)",
          "accent-700": "var(--brand-accent-700, #997e00)",
          "accent-800": "var(--brand-accent-800, #665400)",
          "accent-900": "var(--brand-accent-900, #3d3300)",
          logo: "var(--brand-logo)",
        },
        dark: {
          bg: "#1F2937",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.1)",
        "glass-lg": "0 8px 32px rgba(0, 0, 0, 0.2)",
        glow: "0 0 20px rgba(0, 51, 153, 0.5)",
        "glow-yellow": "0 0 20px rgba(255, 209, 0, 0.5)",
      },
      backdropBlur: {
        glass: "12px",
        "glass-lg": "20px",
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        float: "float 3s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #7700cc 0%, #3b0066 50%, #150024 100%)",
        "mesh-gradient": "radial-gradient(circle at 20% 80%, rgba(119, 0, 204, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(184, 115, 51, 0.1) 0%, transparent 50%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;

