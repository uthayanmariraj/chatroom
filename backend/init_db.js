import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const dbName = process.env.DB_NAME || 'chatroom_db';
    console.log(`Starting database initialization for database: "${dbName}"...`);

    let connection;
    try {
        // Connect to MySQL server without specifying the database first (in case the database doesn't exist yet)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log("Connected to MySQL server.");

        // Create the database if it does not exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database "${dbName}" checked/created.`);

        // Switch to the database
        await connection.query(`USE \`${dbName}\`;`);
        console.log(`Using database "${dbName}".`);

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log("Applying schema definitions...");
        await connection.query(schemaSql);
        console.log("Schema applied successfully! Database is initialized and ready.");

    } catch (err) {
        console.error("Error initializing the database:", err.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

main();
