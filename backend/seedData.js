const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Lead = require('./src/models/Lead');
const Activity = require('./src/models/Activity');
const { distributeUnassignedLeads } = require('./src/services/leadDistributor');

const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Krishna', 'Ishaan', 'Rahul', 'Vikram', 'Rohan', 'Arjun', 'Siddharth', 'Amit', 'Anil', 'Manoj', 'Rakesh', 'Suresh', 'Deepak', 'Rajesh', 'Sunil', 'Vijay', 'Neha', 'Priya', 'Riya', 'Pooja', 'Shruti', 'Anjali', 'Kavita', 'Sonia', 'Naina', 'Meera'];
const lastNames = ['Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Reddy', 'Rao', 'Nair', 'Das', 'Jain', 'Shah', 'Bose', 'Sen', 'Dutta'];
const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];

const matchingLanguages = ['English', 'Hindi', 'Tamil'];
const exoticLanguages = ['French', 'German', 'Spanish', 'Russian', 'Japanese', 'Mandarin', 'Arabic'];

const sources = ['Referral', 'Website', 'Social Media', 'Cold Call', 'Email Campaign', 'Walk-in', 'Other'];
const leadTypes = ['Hot', 'Warm', 'Cold'];

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // CLEAR existing DB!
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Activity.deleteMany({});
    console.log('Cleared existing database records to prepare fresh seed.');

    // 1. Create a Primary Admin purely for access if needed
    await User.create({
      name: 'Admin User',
      email: 'admin@canovacrm.com',
      username: 'admin',
      password: 'password',
      role: 'admin',
      status: 'Active'
    });

    // 2. Generate 10 Employees with specifically MATCHING languages
    const employees = [];
    for(let i=1; i<=10; i++) {
        const fn = random(firstNames);
        const ln = random(lastNames);
        employees.push({
            name: `${fn} ${ln}`,
            email: `${fn.toLowerCase()}${ln.toLowerCase()}${i}@canovacrm.com`,
            username: `${fn.toLowerCase()}${ln.toLowerCase()}${i}`,
            password: 'password', // unified demo password, though bypassed in our system
            role: 'employee',
            language: random(matchingLanguages),
            status: 'Active',
            location: random(locations),
            employeeId: `EMP-${rndInt(1000, 9999)}`,
        });
    }
    
    await User.insertMany(employees);
    console.log(`Inserted 10 regular employees`);
    const allEmps = await User.find({ role: 'employee' });

    // 3. Generate 15 Historical Closed Leads within last 14 days (for graph plotting)
    let pastLeads = [];
    for(let i=0; i<15; i++) {
        const fn = random(firstNames);
        const ln = random(lastNames);
        const date = new Date(Date.now() - rndInt(1, 14) * 86400000); // exactly within 14 days
        const emp = random(allEmps);

        pastLeads.push({
          name: `${fn} ${ln}`,
          email: `${fn.toLowerCase()}${rndInt(10,999)}@gmail.com`,
          source: random(sources),
          date,
          location: random(locations),
          language: emp.language,
          status: 'Closed',
          type: random(leadTypes),
          assignedTo: emp._id,
          createdAt: date
        });

        emp.closedLeads = (emp.closedLeads || 0) + 1;
        await emp.save();
    }
    await Lead.insertMany(pastLeads);
    console.log(`Inserted 15 historical Closed Leads charting the last 14 days`);

    // 4. Generate 30 EXOTIC Leads globally unassigned
    let unassignedLeads = [];
    for(let i=0; i<30; i++) {
        const fn = random(firstNames);
        const ln = random(lastNames);
        const date = new Date(Date.now() - rndInt(0, 3) * 86400000); // recent days

        unassignedLeads.push({
            name: `${fn} ${ln}`,
            email: `${fn.toLowerCase()}${rndInt(10,999)}@gmail.com`,
            source: random(sources),
            date,
            location: random(locations),
            language: random(exoticLanguages), // will not match, stays unassigned
            status: 'Ongoing',
            type: random(leadTypes),
            assignedTo: null,
            createdAt: date
        });
    }

    // 5. Generate 15 MATCHING Leads globally unassigned
    for(let i=0; i<15; i++) {
        const fn = random(firstNames);
        const ln = random(lastNames);
        const date = new Date(Date.now() - rndInt(0, 3) * 86400000); // recent days

        unassignedLeads.push({
            name: `${fn} ${ln}`,
            email: `${fn.toLowerCase()}${rndInt(10,999)}@gmail.com`,
            source: random(sources),
            date,
            location: random(locations),
            language: random(matchingLanguages), // matches explicitly
            status: 'Ongoing',
            type: random(leadTypes),
            assignedTo: null,
            createdAt: date
        });
    }

    await Lead.insertMany(unassignedLeads);
    console.log(`Inserted 30 exotic leads and 15 matching unassigned leads`);

    // 6. Provide manual activity log context
    await Activity.create({ action: `New leads added to the system` });

    // 7. Trigger Reactive Distribution queue! This will grab the 15 MATCHING leads!
    const assignedCount = await distributeUnassignedLeads();
    console.log(`Successfully parsed and distributed ${assignedCount} matching leads across our employee capacity!`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
