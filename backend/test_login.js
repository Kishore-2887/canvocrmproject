const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./src/models/User');
  const identifier = process.argv[2] || 'Kishore';
  const pwd = process.argv[3] || 'Kishore';
  
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
      { name: new RegExp('^' + identifier + '(?:\\s|$)', 'i') }
    ]
  }).select('+password');
  
  console.log('Found user:', user ? user.name : 'null');
  
  if (user) {
    const pwdToCheck = user.role === 'employee' ? pwd.toLowerCase().trim() : pwd;
    const isMatch = await bcrypt.compare(pwdToCheck, user.password);
    console.log('Password checked:', pwdToCheck);
    console.log('Is Password Match:', isMatch);
    
    if (!isMatch) {
        console.log('Actual DB hashed password:', user.password);
    }
  }

  // Also print all employees just to see their names
  const emps = await User.find({ role: 'employee' });
  console.log('All employees:', emps.map(e => e.name).join(', '));
  
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
