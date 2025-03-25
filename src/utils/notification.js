const notificationMessages = {
    signup: (firstName) => ({
      title: "Welcome to DevTinder!",
      body: `Hi ${firstName}, your account has been successfully created. Start exploring now!`,
      type: "signup",
    }),
  
    login: (firstName) => ({
      title: "Welcome Back to DevTinder!",
      body: `Hi ${firstName}, glad to have you back! Start swiping and connecting now.`,
      type: "login",
    }),

    bulk: () => ({
      title: "Bulk Notification of DevTinder!",
      body: "This is a bulk notification sent to multiple users.",
      type: "bulk",
    }),
  };
  
  module.exports = notificationMessages;