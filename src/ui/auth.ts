import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, onAuth } from '../core/firebase';
import UI from './ui';
import { $ } from '../utils/helpers';

const AuthUI = {
  init() {
    onAuth((user) => {
      if (user) {
        console.log('User logged in:', user.email);
        this.showApp();
      } else {
        console.log('User logged out');
        this.showLogin();
      }
    });
  },

  async login() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
      alert('Помилка входу. Спробуйте ще раз.');
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
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    // Show auth screen
    const authScreen = $('screenAuth');
    if (authScreen) {
        authScreen.style.display = 'flex';
        authScreen.classList.add('active');
    }
    // Hide nav
    const nav = $('mainNav');
    if (nav) nav.style.display = 'none';
  },

  showApp() {
    // Hide auth screen
    const authScreen = $('screenAuth');
    if (authScreen) {
        authScreen.style.display = 'none';
        authScreen.classList.remove('active');
    }
    // Show nav
    const nav = $('mainNav');
    if (nav) nav.style.display = 'flex';
    
    // Default to dashboard
    UI.navigate('screenDashboard');
  }
};

export default AuthUI;
(window as any).AuthUI = AuthUI;
