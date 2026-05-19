const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

exports.dailyReminder = onSchedule('every day 09:00', async () => {
  const snapshot = await db.collectionGroup('metadata')
    .where('enabled', '==', true)
    .get();

  const tokens = [];
  snapshot.forEach(doc => {
    if (doc.id === 'fcm' && doc.data().token) {
      tokens.push(doc.data().token);
    }
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: 'Слово Живе',
      body: 'Час вивчити вірш дня! \u{1F4D6}',
    },
    data: { url: '/' },
  };

  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const response = await messaging.sendEachForMulticast({
      ...message,
      tokens: batch,
    });

    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered') {
          failedTokens.push(batch[idx]);
        }
      }
    });

    for (const token of failedTokens) {
      const snap = await db.collectionGroup('metadata')
        .where('token', '==', token)
        .get();
      snap.forEach(doc => doc.ref.delete());
    }
  }
});
