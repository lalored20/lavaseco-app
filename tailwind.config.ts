
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                orchid: {
                    50: '#fbf7ff',
                    100: '#f5effe',
                    200: '#eddffd',
                    300: '#e0c4fb',
                    400: '#cd9df6',
                    500: '#b36eed',  // Primary Brand Color
                    600: '#9d4ce3',
                    700: '#8635c9',
                    800: '#712da3',
                    900: '#5d2583',
                    950: '#3d0f5c',
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
