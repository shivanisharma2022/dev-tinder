const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect('mongodb+srv://learning:learning@learning.jc6eg.mongodb.net/devTinder')
};
module.exports = connectDB;
