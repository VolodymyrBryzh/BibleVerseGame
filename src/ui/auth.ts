import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, onAuth } from '../core/firebase';
import UI from './ui';
import { $ } from '../utils/helpers';

const AuthUI = {
  init() {
    this.showLoading();
    onAuth(async (user) => {
      if (user) {
        console.log('User logged in:', user.email);
        try {
          // Initialize data BEFORE showing app
          await VersesDB.init();
          await Stats.init();
          UI.init();
          Manage.init();
          this.showApp();
        } catch (error) {
          console.error('Data sync failed', error);
          alert('Помилка синхронізації даних.');
          this.showLogin();
        }
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

  showLoading() {
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    const screen = $('screenLoading');
    if (screen) screen.style.display = 'flex';
  },

  showLogin() {
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    const authScreen = $('screenAuth');
    if (authScreen) {
        authScreen.style.display = 'flex';
        authScreen.classList.add('active');
    }
    const nav = $('mainNav');
    if (nav) nav.style.display = 'none';
  },

  showApp() {
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    const nav = $('mainNav');
    if (nav) nav.style.display = 'flex';
    
    UI.navigate('screenDashboard');
  }
};

export default AuthUI;
(window as any).AuthUI = AuthUI;
