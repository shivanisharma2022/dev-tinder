const mongoose = require('mongoose');

const connectDB = async () => {
    //await mongoose.connect('mongodb://localhost:27017/dev-tinder')
    await mongoose.connect('mongodb+srv://tinderDev:tinderDev@tinderdev.jc6eg.mongodb.net/tinderDev')
};
module.exports = connectDB;
