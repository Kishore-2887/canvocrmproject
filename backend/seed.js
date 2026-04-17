/**
 * Seed Script — creates admin + sample employees
 * Run: node seed.js
 */

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const sampleEmployees = [
  { name: 'Ravi Kumar',   email: 'ravi@salescrm.com',   language: 'Tamil' },
  { name: 'Priya Sharma', email: 'priya@salescrm.com',  language: 'Hindi' },
  { name: 'Arun Babu',    email: 'arun@salescrm.com',   language: 'Malayalam' },
];

const seed = async () => {
  await connectDB();

  // ── Seed Admin ──────────────────────────────────────
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@salescrm.com';
  const adminExists = await User.findOne({ email: adminEmail });

  if (adminExists) {
    console.log(`⚠️  Admin already exists: ${adminEmail}`);
  } else {
    await User.create({
      name: 'Admin',
      email: adminEmail,
      password: process.env.ADMIN_SEED_PASSWORD || 'Admin@123',
      role: 'admin',
      status: 'Active',
      language: 'English',
    });
    console.log(`✅ Admin created`);
    console.log(`   Email   : ${adminEmail}`);
    console.log(`   Password: ${process.env.ADMIN_SEED_PASSWORD || 'Admin@123'}`);
  }

  // ── Seed Employees ───────────────────────────────────
  console.log('\n👥 Seeding employees...');
  for (const emp of sampleEmployees) {
    const exists = await User.findOne({ email: emp.email });
    if (exists) {
      console.log(`   ⚠️  Already exists: ${emp.email}`);
      continue;
    }

    // username = lowercased name with dots: "Ravi Kumar" → "ravi.kumar"
    const username = emp.name.trim().toLowerCase().replace(/\s+/g, '.');
    const password = username; // password = username

    await User.create({
      name: emp.name,
      email: emp.email,
      username,
      password,
      language: emp.language || 'English',
      status: 'Active',
      role: 'employee',
    });

    console.log(`   ✅ ${emp.name}`);
    console.log(`      Username : ${username}`);
    console.log(`      Password : ${password}`);
  }

  console.log('\n🎉 Seed complete!\n');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
