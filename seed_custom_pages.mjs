import mysql from 'mysql2/promise';

async function seedPages() {
  console.log("Seeding custom pages...");
  const connection = await mysql.createConnection({
    uri: 'mysql://root@localhost:3306/catalog'
  });

  try {
    const pages = [
      { title: 'Warranty Information', type: 'custom', category: 'all', sortOrder: 10 },
      { title: 'Terms and Conditions', type: 'custom', category: 'all', sortOrder: 11 },
      { title: 'Radiator Specifications Guide', type: 'custom', category: 'radiators', sortOrder: 12 },
      { title: 'Condenser Installation Manual', type: 'custom', category: 'condensers', sortOrder: 13 }
    ];

    for (const p of pages) {
      await connection.execute(`
        INSERT INTO content_pages (title, type, category, sort_order)
        VALUES (?, ?, ?, ?)
      `, [p.title, p.type, p.category, p.sortOrder]);
      console.log(`Inserted page: ${p.title}`);
    }
    
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await connection.end();
  }
}

seedPages().catch(console.error);
