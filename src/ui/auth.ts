import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider, onAuth } from '../core/firebase';
import VersesDB from '../core/database';
import Stats from '../core/stats';
import UI from './ui';
import Manage from './manage';
import { $ } from '../utils/helpers';

const AuthUI = {
	init() {
		// Handle redirect result (when returning from Google sign-in)
		getRedirectResult(auth).catch(e => console.error('Redirect result error', e));

		onAuth(async (user) => {
			if (user) {
				console.log('User logged in:', user.email);
				await VersesDB.init();
				await Stats.init();
				UI.init();
				Manage.init();
				this.showApp();
			} else {
				console.log('User logged out');
				this.showLogin();
			}
		});
	},

	async login() {
		try {
			// Try popup first (works on desktop)
			await signInWithPopup(auth, googleProvider);
		} catch (error: any) {
			if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
				// Fallback to redirect (works on mobile & when popups blocked)
				console.log('Popup blocked, falling back to redirect...');
				await signInWithRedirect(auth, googleProvider);
			} else {
				console.error('Login failed', error);
				alert('Помилка входу. Спробуйте ще раз.');
			}
		}
	},

	async continueAsGuest() {
		console.log('Continuing as guest');
		await VersesDB.init();
		await Stats.init();
		UI.init();
		Manage.init();
		this.showApp();
	},

	async logout() {
		try {
			await signOut(auth);
		} catch (error) {
			console.error('Logout failed', error);
		}
	},

	showLogin() {
		document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
		const authScreen = $('screenAuth');
		if (authScreen) authScreen.classList.add('active');

		const nav = $('mainNav');
		if (nav) nav.style.display = 'none';
	},

	showApp() {
		document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
		const nav = $('mainNav');
		if (nav) nav.style.display = 'flex';

		UI.navigate('screenDashboard');
	}
};

export default AuthUI;
(window as any).AuthUI = AuthUI;
