import mysql from 'mysql2/promise';
(async () => {
  try {
    // Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) { console.error('Login failed', loginJson); process.exit(1); }
    const token = loginJson.token;

    // Fetch sample image
    const imgUrl = 'https://via.placeholder.com/600x400.jpg';
    const imgRes = await fetch(imgUrl);
    const buf = await imgRes.arrayBuffer();
    const b = Buffer.from(buf);
    const dataUrl = 'data:image/jpeg;base64,' + b.toString('base64');

    console.log('Length of dataUrl:', dataUrl.length);

    // PUT to product id 1
    const putRes = await fetch('http://localhost:5000/api/products/1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ imageUrl: dataUrl })
    });
    const putJson = await putRes.json();
    console.log('PUT status', putRes.status, putJson);

    // Verify DB length
    const c = await mysql.createConnection('mysql://root@localhost:3306/catalog');
    const [rows] = await c.query("SELECT id, CHAR_LENGTH(image_url) as len FROM products WHERE id = 1");
    console.log(rows);
    await c.end();
  } catch (e) { console.error('ERR', e.message); process.exit(1); }
})();