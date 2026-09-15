/**
 * Global game constants, limits and storage keys.
 */
export const GAME_CONFIG = {
  XP_REWARDS: {
    'word-order': 30,
    'fill-gaps': 45,
    'continue': 60,
  } as Record<string, number>,
  DEFAULT_XP_REWARD: 30,
  HINT_COST: 5,
  MAX_HINTS: 3,
  PASSING_ACCURACY: 0.8,
  FILL_GAPS_RATIO: 0.3,
  MIN_GAPS: 2,
  TOAST_DURATION_MS: 2200,
  FREEZE_COOLDOWN_DAYS: 7,
  ACTIVITY_DAYS: 14,
  STORAGE_KEYS: {
    XP: 'bvg_xp',
    STREAK: 'bvg_streak',
    BEST_STREAK: 'bvg_best_streak',
    LAST_ACTIVE_DATE: 'bvg_last_active_date',
    LAST_FREEZE_DATE: 'bvg_last_freeze_date',
    NOTIFY_ENABLED: 'bvg_notifications_enabled',
    FCM_TOKEN: 'bvg_fcm_token',
    VERSE_OF_WEEK: 'bvg_verse_of_week',
    GUEST_VERSES: 'guestVerses'
  }
} as const;
