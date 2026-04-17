/**
 * Remote seed — calls the LIVE Render API to populate data
 * Run: node remoteSeed.js
 */

const BASE = 'https://canvo-backend.onrender.com/api';

const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Krishna', 'Rahul', 'Vikram', 'Rohan', 'Arjun', 'Neha', 'Priya'];
const lastNames = ['Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta'];
const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];
const languages = ['English', 'Hindi', 'Tamil', 'English', 'Hindi'];
const sources = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Email Campaign'];
const types = ['Hot', 'Warm', 'Cold'];

const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function seed() {
  console.log('🌱 Starting remote seed against', BASE);

  // 1. Create 10 employees
  const employees = [];
  for (let i = 0; i < 10; i++) {
    const fn = firstNames[i];
    const ln = r(lastNames);
    const lang = languages[i % languages.length];
    const res = await post('/employees', {
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}${i + 1}@canovacrm.com`,
      language: lang,
      status: 'Active',
    });
    if (res.success) {
      employees.push({ ...res.data, language: lang });
      console.log(`  ✅ Employee: ${fn} ${ln} (${lang})`);
    } else {
      console.log(`  ⚠️  Employee failed:`, res.message);
    }
  }

  // 2. Create 30 leads
  for (let i = 0; i < 30; i++) {
    const fn = r(firstNames);
    const ln = r(lastNames);
    const res = await post('/leads', {
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}${ri(10, 999)}@gmail.com`,
      source: r(sources),
      location: r(locations),
      language: r(['English', 'Hindi', 'Tamil', 'French', 'German']),
      date: new Date(Date.now() - ri(0, 14) * 86400000).toISOString(),
    });
    if (res.success) {
      process.stdout.write('.');
    } else {
      process.stdout.write('x');
    }
  }
  console.log('\n  ✅ 30 leads created');

  console.log('\n🎉 Remote seed complete! Refresh your Vercel apps.');
}

seed().catch(console.error);
