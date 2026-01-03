/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    default: '#6264A7',
                    dark: '#464775',
                    darker: '#33344A',
                    light: '#8B8CC7',
                },
            },
        },
    },
    plugins: [],
}
