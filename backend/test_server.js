const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const { login } = require('./src/controllers/authController');

const app = express();
app.use(express.json());
app.post('/api/auth/login', login);

mongoose.connect(process.env.MONGO_URI).then(() => {
  const server = app.listen(5001, async () => {
    console.log('Listening on 5001');
    const r = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ravi', password: 'ravi' })
    });
    console.log('Status code:', r.status);
    console.log('Response:', await r.json());
    server.close();
    process.exit(0);
  });
});
