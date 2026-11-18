import { defineConfig } from 'vite';

export default defineConfig({
	root: '.',
	publicDir: 'public',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks: {
					firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
					dexie: ['dexie']
				}
			}
		}
	},
	server: {
		port: 5005,
		open: true,
		strictPort: true,
		host: true,
	}
});
