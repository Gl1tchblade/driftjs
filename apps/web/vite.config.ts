import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteCompression from 'vite-plugin-compression';
import Sitemap from 'vite-plugin-sitemap';

export default defineConfig({
	plugins: [tailwindcss(), TanStackRouterVite({}), react(), viteCompression(), Sitemap({ hostname: 'https://example.com' })],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
