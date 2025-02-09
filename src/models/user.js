const mongoose = require("mongoose");
const { COLLECTION } = require("../utils/constant");
const validator = require("validator"); // to add some strong validations
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      index: true,  //like this also we can create an index 
      minLength: 4,
      maxLength: 20,
      trim: true,
    },
    lastName: {
      type: String,
    },
    phone: {
      type: String,
      validate(value) {
        if (!validator.isMobilePhone(value)) {
          throw new Error("Enter a valid phone number" + value);
        }
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,   // mongodb automatically creates an index on the field which is unique
      lowercase: true, // index is used to faster search
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address" + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error("Enter a strong password" + value);
        }
      },
    },
    age: {
      type: Number,
      default: 0,
      //min: 18, // in case of number it is min, in case of string it is minLength
    },
    gender: {
      type: String,
      default: 'other',
      validate(value) {
        // this will only work in case of when creating a new document, not in case of updating
        if (!["male", "female", "other"].includes(value)) {
          // if we write runValidators: true when using with findByIdAndUpdate
          throw new Error("Invalid gender");
        }
      },
    },
    imageUrl: {
      type: String,
      default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png',
      // validate(value) {
      //   if (!validator.isURL(value)) {
      //     throw new Error("Invalid image url" + value);
      //   }
      // },
    },
    description: {
      type: String,
      default: "This is the default description of the user",
    },
    skills: {
      type: [String], // if not given in payload then also it will create some empty space in db
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
      default: "free",
    },
    emailVerify: {
      type: mongoose.Schema.Types.Object,
      default: {
        otp: "",
        expiresAt: null,
        isVerified: false
      },
      properties: {
        otp: {
          type: String,
          required: true
        },
        expiresAt: {
          type: Date,
          required: true
        },
        isVerified: {
          type: Boolean,
          default: false
        }
      }
    },
    phoneVerify: {
      type: mongoose.Schema.Types.Object,
      default: {
        otp: "",
        expiresAt: null,
        isVerified: false
      },
      properties: {
        otp: {
          type: String,
          required: true
        },
        expiresAt: {
          type: Date,
          required: true
        },
        isVerified: {
          type: Boolean,
          default: false
        }
      }
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    }
  },
  {
    versionKey: false,
    //collection: COLLECTION.USER,
    timestamps: true,
}
);

// Schema methods related to user
// userSchema.methods.getJWT = async function () { // makes our function re-usable, if we want to create jwt token somewhere else also
//   const user = this;
//   const token = await jwt.sign({ _id: user._id }, "dev@tinder$3000", {
//     expiresIn: "1h",
//   });
//   return token;
// }

// userSchema.methods.validatePassword = async function (passwordInputByUser) {
//   const user = this;
//   const passwordHash = user.password;
//   const isPasswordValid = await bcrypt.compare(
//     passwordInputByUser,
//     passwordHash
//   );
//   return isPasswordValid;
// };

const User = mongoose.model("User", userSchema);

module.exports = User;

//module.exports = mongoose.model("User", userSchema);
