import { signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously, signOut } from 'firebase/auth';
import { auth, googleProvider, onAuth } from '../core/firebase';
import VersesDB from '../core/database';
import Stats from '../core/stats';
import UI from './ui';
import Manage from './manage';
import { $ } from '../utils/helpers';

const AuthUI = {
	init() {
		// Обробляємо повернення після redirect-логіну (на мобільних)
		getRedirectResult(auth).then((result) => {
			if (result && result.user) {
				console.log('Successfully logged in via redirect');
			}
		}).catch(e => console.error('Redirect result error', e));

		onAuth(async (user) => {
			if (user) {
				console.log('User logged in:', user.email || 'Anonymous', user.uid);
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
			// Спочатку пробуємо popup (найкраще для десктопа)
			await signInWithPopup(auth, googleProvider);
		} catch (error: any) {
			if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
				// Якщо заблоковано (на мобільних), переходимо на redirect
				console.log('Popup blocked, falling back to redirect...');
				await signInWithRedirect(auth, googleProvider);
			} else {
				console.error('Login failed', error);
				alert('Помилка входу. Спробуйте ще раз.');
			}
		}
	},

	async continueAsGuest() {
		try {
			console.log('Logging in anonymously...');
			// Входимо анонімно. Firebase створить повноцінний акаунт (uid) і
			// всі дані будуть зберігатися в Firestore, як і для звичайного юзера!
			await signInAnonymously(auth);
		} catch (error: any) {
			console.error('Anonymous login failed', error);
			alert('Помилка гостьового входу. Спробуйте ще раз.');
		}
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
