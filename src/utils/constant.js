const COLLECTION = {
  USER: 'user',
  USER_SESSION: 'user_session',
  PAYMENT: 'payment',
  CHAT: 'chat',
  CONNECTION_REQUEST: 'connection_request',
}

const membershipAmount = {
    "silver": 300, 
    "gold": 700    
};


function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000);
  }

module.exports = { membershipAmount, generateRandomCode, COLLECTION };