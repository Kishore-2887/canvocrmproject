fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'kishore', password: 'kishore' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
