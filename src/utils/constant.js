const membershipAmount = {
    "silver": 300, 
    "gold": 700    
};

/**
 * Generates a random 6-digit code.
 *
 * @returns {number} A random 6-digit code.
 */
function generateRandomCode() {
    return Math.floor(100000 + Math.random() * 900000);
  }

module.exports = { membershipAmount, generateRandomCode };