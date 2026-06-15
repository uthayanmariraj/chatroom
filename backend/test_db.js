import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log("Connected to MySQL database!");
        const [tables] = await connection.query("SHOW TABLES;");
        console.log("Tables:", tables);
        await connection.end();
    } catch (err) {
        console.error("Error connecting to database:", err);
    }
}
main();
