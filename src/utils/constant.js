const COLLECTION = {
  USER: 'user',
  USER_SESSION: 'userSession',
  PAYMENT: 'payment',
  CHAT: 'chat',
  CONNECTION_REQUEST: 'connectionRequest',
}

const membershipAmount = {
    "silver": 300, 
    "gold": 700    
};


function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000);
  }

module.exports = { membershipAmount, generateRandomCode, COLLECTION };