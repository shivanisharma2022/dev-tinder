const express = require("express");
const profileRouter = express.Router();
const jwt = require("jsonwebtoken");
const { userAuth } = require("../middlewares/auth");
const { validateEditData } = require("../utils/validation");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error getting the user: " + err.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditData(req)) {
      throw new Error("Invalid Edit Request"); // this same error will only be catched in the catch block
    }
    const loggedInUser = req.user;
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();
    console.log(loggedInUser);
    res.send({
      message: `${loggedInUser.firstName}, Profile Updated Successfully`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error updating the user: " + err.message);
  }
});

//   // Update API - update user by id in db
// //profileRouter.patch("/user", async (req, res) => {
// //const userId = req.body.userId;
// profileRouter.patch("/user/:userId", userAuth, async (req, res) => {
//     const userId = req.params?.userId;
//     const updatedData = req.body;
//     try {
//       const ALLOWED_UPDATES = [
//         "imageUrl",
//         "description",
//         "gender",
//         "age",
//         "skills",
//       ];
//       const isUpdateAllowed = Object.keys(updatedData).every((k) =>
//         ALLOWED_UPDATES.includes(k)
//       );
//       if (!isUpdateAllowed) {
//         throw new Error("Invalid updates");
//       }
//       if (updatedData?.skills.length > 10) {
//         throw new Error("Skills cannot be more than 10");
//       }
//       //const user = await User.findByIdAndUpdate({ _id: userId}, updatedData, {new: true});
//       const user = await User.findByIdAndUpdate({ _id: userId }, updatedData, {
//         returnNewDocument: "after",
//         runValidators: true,
//       });
//       res.send("User Updated Successfully");
//     } catch (err) {
//       res.status(400).send("Error updating the user: " + err.message);
//     }
//   });

module.exports = { profileRouter };
