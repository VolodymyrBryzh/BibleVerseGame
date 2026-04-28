import { defineConfig } from 'vite';

export default defineConfig({
	root: '.',
	publicDir: 'public',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
	server: {
		port: 5005,
		open: true,
		strictPort: true,
		host: true,
	}
});
