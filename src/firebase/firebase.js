const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async (fcmToken, payload) => {
  try {
    const message = {
      notification: {
          title: payload.title,
          body: payload.body
      },
      token: fcmToken
  };

    await admin.messaging().send(message);
    console.log(`Notification sent: ${title}`);
  } catch (error) {
    console.log("Error sending notification:", error);
  }
};

module.exports = { admin, sendPushNotification };
