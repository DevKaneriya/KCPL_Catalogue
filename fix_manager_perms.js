const mysql = require('mysql2/promise');

async function main() {
  try {
    const connection = await mysql.createConnection('mysql://root@localhost:3306/catalog');
    
    // Clean up permissions for Manager (ID 2)
    const perms = ["products:write","products:delete","categories:write","catalog:read","content:write","export","users:write","roles:write"];
    const permsStr = JSON.stringify(perms);
    
    await connection.execute('UPDATE roles SET permissions = ? WHERE id = 2', [permsStr]);
    console.log('Successfully updated Manager role permissions to:', permsStr);
    
    // Verify
    const [rows] = await connection.execute('SELECT permissions FROM roles WHERE id = 2');
    console.log('Verified from DB:', rows[0].permissions);
    console.log('Type of confirmed value:', typeof rows[0].permissions);
    
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

main();
