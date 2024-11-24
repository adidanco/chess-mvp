const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'chess_mvp',
    password: 'aatithya123',
    port: 5432,
});

module.exports = pool;
