const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const employees = await User.find({ role: 'employee' }).select('+password');
    let count = 0;
    for (let emp of employees) {
      if (emp.email) {
        emp.password = emp.email.toLowerCase().trim();
        await emp.save(); // triggers pre-save hash
        count++;
      }
    }
    console.log(`Migrated ${count} passwords.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

migrate();
