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

		// Перевірка доступу до сховища
		try {
			localStorage.setItem('storage_test', '1');
			localStorage.removeItem('storage_test');
		} catch (e) {
			console.error('Storage access is blocked!');
			alert('Увага: Ваш браузер блокує доступ до локального сховища. Авторизація через Google може не працювати. Будь ласка, вимкніть "Захист від відстеження" або дозвольте сторонні cookies у налаштуваннях браузера.');
		}
		
		// 1. Створюємо HTML-структуру екрана входу, якщо її ще немає
		if (!$('screenAuth')) {
			console.log('Creating screenAuth element...');
			const html = `
				<div class="auth-card">
					<div class="auth-hero">
						<svg class="auth-hero-svg" viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
							<!-- open book -->
							<rect x="40" y="80" width="110" height="150" rx="6" fill="var(--bg-selected)" stroke="var(--accent)" stroke-width="1.2"/>
							<rect x="170" y="80" width="110" height="150" rx="6" fill="var(--bg-selected)" stroke="var(--accent)" stroke-width="1.2"/>
							<path d="M150 80c0 0 10 8 10 50s-10 100-10 100" stroke="var(--accent)" stroke-width="1.2" fill="none"/>
							<path d="M170 80c0 0-10 8-10 50s10 100 10 100" stroke="var(--accent)" stroke-width="1.2" fill="none"/>
							<!-- text lines left -->
							<line x1="56" y1="110" x2="130" y2="110" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.2"/>
							<line x1="56" y1="122" x2="124" y2="122" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.15"/>
							<line x1="56" y1="134" x2="128" y2="134" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.2"/>
							<line x1="56" y1="146" x2="118" y2="146" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.15"/>
							<line x1="56" y1="158" x2="126" y2="158" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.1"/>
							<!-- text lines right -->
							<line x1="190" y1="110" x2="264" y2="110" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.2"/>
							<line x1="190" y1="122" x2="258" y2="122" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.15"/>
							<line x1="190" y1="134" x2="262" y2="134" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.2"/>
							<line x1="190" y1="146" x2="252" y2="146" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.15"/>
							<line x1="190" y1="158" x2="260" y2="158" stroke="var(--text-muted)" stroke-width="0.8" opacity="0.1"/>
							<!-- glow/light from book -->
							<ellipse cx="160" cy="130" rx="60" ry="40" fill="var(--accent)" opacity="0.03"/>
							<!-- cross -->
							<line x1="160" y1="20" x2="160" y2="65" stroke="var(--accent)" stroke-width="1.5" opacity="0.25"/>
							<line x1="143" y1="38" x2="177" y2="38" stroke="var(--accent)" stroke-width="1.5" opacity="0.25"/>
						</svg>
					</div>
					<div class="auth-content">
						<h1 class="auth-title">Слово Живе</h1>
						<p class="auth-subtitle">Вивчай Святе Письмо. По одному віршу за раз — і Слово залишиться в тобі.</p>

						<div class="auth-buttons">
							<button id="btnGoogleLogin" class="btn btn-primary btn-block" style="display:flex; align-items:center; justify-content:center; gap:12px; padding:16px; position:relative; z-index:100;">
								<img src="/img/googleLogo.svg" width="20" height="20" alt="Google"> Увійти через Google
							</button>

							<button id="btnGuestLogin" class="btn btn-block" style="padding:16px; background: transparent; border: 1.5px solid var(--border); color: var(--text-muted); position:relative; z-index:100;">
								Продовжити як гість
							</button>
						</div>
					</div>
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
		
		if (googleBtn) {
			console.log('Attaching addEventListener to Google button');
			googleBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				console.log('Google login button clicked via addEventListener!');
				this.login();
			});
		}
		
		if (guestBtn) {
			guestBtn.addEventListener('click', () => {
				console.log('Guest login button clicked!');
				this.continueAsGuest();
			});
		}

		// Глобальний дебаг кліків
		document.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			console.log('Global click target:', target.tagName, target.id, target.className);
		}, { capture: true });

		// 2. Обробляємо Firebase Auth
		console.log('Checking redirect result...');
		getRedirectResult(auth).then((result) => {
			if (result && result.user) {
				console.log('Successfully logged in via redirect! User:', result.user.email);
			} else {
				console.log('No redirect result found (normal flow or failed redirect)');
			}
		}).catch(e => {
			console.error('Redirect result error:', e.code, e.message);
			alert('Помилка авторизації після повернення: ' + e.message);
		});

		console.log('Setting up onAuth listener...');
		onAuth(async (user) => {
			if (user) {
				console.log('onAuth: User detected!', user.email || 'Anonymous', user.uid);
				this.updateProfileUI(user);
				
				try {
					console.log('Initializing DB and Stats...');
					await VersesDB.init();
					await Stats.init();
					console.log('Initializing UI and Manage...');
					UI.init();
					Manage.init();
					console.log('Showing app...');
					this.showApp();
				} catch (err) {
					console.error('Error during app initialization after login:', err);
				}
			} else {
				console.log('onAuth: No user found (User logged out)');
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
