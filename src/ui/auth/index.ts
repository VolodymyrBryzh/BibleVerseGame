import { signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously, signOut } from 'firebase/auth';
import { auth, googleProvider, onAuth } from '../../core/firebase';
googleProvider.setCustomParameters({ prompt: 'select_account' });
import VersesDB from '../../core/database';
import Stats from '../../core/stats';
import UI from '../ui';
import Manage from '../manage';
import { $ } from '../../utils/helpers';

const AuthUI = {
	init(): void {
		console.log('AuthUI.init() called');
		
		// 1. Створюємо HTML-структуру екрана входу, якщо її ще немає
		if (!$('screenAuth')) {
			console.log('Creating screenAuth element...');
			const html = `
				<div class="card" style="text-align:center; padding: 40px 20px; width: 100%;">
					<div style="font-size: 4rem; margin-bottom: 20px;">📖</div>
					<h1 style="font-size: 2rem; margin-bottom: 10px;">BibleVerse</h1>
					<p style="color:var(--text-light); margin-bottom: 30px;">Вивчайте Біблію разом із нами. Ваші дані будуть синхронізовані між усіма пристроями.</p>

					<button id="btnGoogleLogin" class="btn btn-primary btn-block" style="display:flex; align-items:center; justify-content:center; gap:12px; padding:16px; margin-bottom:12px;">
						<img src="/img/googleLogo.svg" width="20" height="20" alt="Google"> Увійти через Google
					</button>

					<button id="btnGuestLogin" class="btn btn-block" style="padding:16px; background: transparent; border: 1.5px solid var(--border); color: var(--text-muted);">
						Продовжити як гість
					</button>
				</div>
			`;

			const screen = document.createElement('div');
			screen.id = 'screenAuth';
			screen.className = 'screen';
			screen.style.cssText = 'justify-content:center; align-items:center; min-height:80vh;';
			screen.innerHTML = html;

			const appEl = document.querySelector('.app');
			if (appEl) {
				appEl.prepend(screen);
				console.log('screenAuth prepended to .app');
			} else {
				console.error('.app element not found!');
			}
		}

		// Додаємо обробники подій (щоразу при ініціалізації)
		const googleBtn = $('btnGoogleLogin');
		const guestBtn = $('btnGuestLogin');
		
		console.log('Google button found in DOM:', !!googleBtn);
		console.log('Guest button found in DOM:', !!guestBtn);

		if (googleBtn) {
			// Видаляємо старий обробник (якщо є) і додаємо новий
			googleBtn.onclick = () => {
				console.log('Google login button clicked!');
				this.login();
			};
		}
		
		if (guestBtn) {
			guestBtn.onclick = () => {
				console.log('Guest login button clicked!');
				this.continueAsGuest();
			};
		}

		// 2. Обробляємо Firebase Auth
		getRedirectResult(auth).then((result) => {
			if (result && result.user) {
				console.log('Successfully logged in via redirect');
			}
		}).catch(e => console.error('Redirect result error', e));

		onAuth(async (user) => {
			if (user) {
				console.log('User logged in:', user.email || 'Anonymous', user.uid);
				this.updateProfileUI(user);
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

	updateProfileUI(user: any): void {
		const nameEl = $('userName');
		const emailEl = $('userEmail');
		const avatarEl = $('userAvatar');

		if (nameEl) nameEl.textContent = user.displayName || 'Гість';
		if (emailEl) emailEl.textContent = user.email || 'Анонімний вхід';
		if (avatarEl && user.photoURL) {
			avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:80px; height:80px; border-radius:50%; border: 3px solid var(--accent-bg);">`;
		} else if (avatarEl) {
			avatarEl.textContent = '👤';
		}
	},

	async login(): Promise<void> {
		try {
			console.log('Starting Google login...');
			await signInWithPopup(auth, googleProvider);
		} catch (error: any) {
			console.error('Login error code:', error?.code);
			console.error('Login error message:', error?.message);

			if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
				console.log('Popup issue, falling back to redirect...');
				try {
					await signInWithRedirect(auth, googleProvider);
				} catch (redirectError: any) {
					console.error('Redirect failed', redirectError);
					alert('Помилка редиректу: ' + (redirectError?.message || 'невідома помилка'));
				}
			} else if (error?.code === 'auth/unauthorized-domain') {
				alert('Помилка: цей домен не авторизований у Firebase. Додайте його в консолі Firebase.');
			} else {
				alert('Помилка входу: ' + (error?.message || 'Спробуйте ще раз.'));
			}
		}
	},

	async continueAsGuest(): Promise<void> {
		try {
			await signInAnonymously(auth);
		} catch (error: any) {
			console.error('Anonymous login failed', error);
			alert('Помилка гостьового входу. Спробуйте ще раз.');
		}
	},

	async logout(): Promise<void> {
		try {
			await signOut(auth);
		} catch (error) {
			console.error('Logout failed', error);
		}
	},

	showLogin(): void {
		document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
		const authScreen = $('screenAuth');
		if (authScreen) authScreen.classList.add('active');

		const nav = $('mainNav');
		if (nav) nav.style.display = 'none';
	},

	showApp(): void {
		document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
		const nav = $('mainNav');
		if (nav) nav.style.display = 'flex';

		UI.navigate('screenDashboard');
	}
};

export default AuthUI;
(window as any).AuthUI = AuthUI;
