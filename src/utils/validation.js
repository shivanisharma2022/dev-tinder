const validator = require("validator");

const validateSignupData = (req) => {
  const { firstName, lastName, email, password } = req.body; // destructuring, to take out all the values from req.body
  if (!firstName || !lastName) {
    throw new Error("First name is reuired");
  } else if (firstName.length < 4 || firstName.length > 20) {
    throw new Error("First name must be between 4 and 20 characters");
  } else if (!validator.isEmail(email)) {
    throw new Error("Enter a valid email");
  } else if(!validator.isStrongPassword(password)){
    throw new Error("Password is not strong enough");
  }
};

const validateEditData = (req) => {
  const allowedEditFields = ['firstName', 'lastName', 'email', 'imageUrl', 'gender', 'age', 'description', 'skills'];
  const isEditAllowed = Object.keys(req.body).every((field) => 
  allowedEditFields.includes(field) 
);
return isEditAllowed;
}

module.exports = { validateSignupData, validateEditData };