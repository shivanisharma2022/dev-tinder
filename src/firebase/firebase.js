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

    console.log(`Sending batch notification to........... ${fcmTokens.length} tokens`);

    const messages = fcmTokens.map(token => ({
      notification: {
        title: payload.title,
        body: payload.body,
      },
      token,
    }));

    for (const message of messages) {
      try {
        const response = await admin.messaging().send(message);
        console.log(`Notification sent successfully to ${message.token}:`, response);
      } catch (error) {
        console.error(`Error sending notification to ${message.token}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in sending notifications:', error);
  }
}

module.exports = { admin, sendPushNotification, sendPushNotificationBatch };
