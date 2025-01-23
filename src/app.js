const express = require("express");
const app = express();
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const { authRouter } = require("./routes/auth.route");
const { profileRouter } = require("./routes/profile.route");
const { requestRouter } = require("./routes/request.route");
const { userRouter } = require("./routes/user.route");
const cors = require("cors");
require("dotenv").config();
require("./utils/cronjob");

app.use(                                 // cors is used before any other middleware
  cors({
    origin: "http://localhost:5173",      // whitelist the domains that are allowed to make cross-origin requests
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);

connectDB()
  .then(() => {
    console.log("MongoDB connection established......");
    app.listen(process.env.PORT, () => {
      console.log(`Server is successfully running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err);
  });
