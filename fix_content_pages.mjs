import mysql from 'mysql2/promise';

async function fixTable() {
  console.log("Altering content_pages table...");
  const connection = await mysql.createConnection({
    uri: 'mysql://root@localhost:3306/catalog'
  });

  try {
    try {
        await connection.execute(`ALTER TABLE content_pages ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'editor'`);
        console.log("Added type column");
    } catch (e) {
        if(e.code === 'ER_DUP_FIELDNAME') console.log("type already exists");
        else console.error(e);
    }
    
    try {
        await connection.execute(`ALTER TABLE content_pages ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT 'all'`);
        console.log("Added category column");
    } catch (e) {
        if(e.code === 'ER_DUP_FIELDNAME') console.log("category already exists");
        else console.error(e);
    }
    
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await connection.end();
  }
}

fixTable().catch(console.error);
