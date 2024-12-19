console.log('hello world');

const express = require('express');
const app = express(); // on calling express we created a instance(application) of express, which will allow us to create a new server.

app.use((req,res) => {
    res.send('Hello World');
})

app.use('/test', (req,res) => {
    res.send('Welcome Welcome !!');
})

app.use('/hello', (req,res) => {
    res.send('Hello Hello Hello!!');
})

app.listen(2730, () => {
    console.log('Server is listening on port 3000');
})