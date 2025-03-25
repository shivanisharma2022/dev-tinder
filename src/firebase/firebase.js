const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async (fcmToken, payload) => {
  try {
    if (!fcmToken) {
      console.error("FCM Token is missing.");
      return;
    }

    const message = {
      notification: { title: payload.title, body: payload.body },
      token: fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`Notification sent: ${payload.title}`);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const sendPushNotificationBatch = async (fcmTokens, payload) => {
  try {
    if (!fcmTokens || fcmTokens.length === 0) {
      console.error("No FCM tokens provided for batch notification.");
      return;
    }

    const message = {
      notification: { title: payload.title, body: payload.body },
      tokens: fcmTokens,
    };

    await admin.messaging().sendMulticast(message);
    console.log(`Batch notification sent successfully: ${payload.title}`);
  } catch (error) {
    console.error("Error sending batch notifications:", error);
  }
};

module.exports = { admin, sendPushNotification, sendPushNotificationBatch };
