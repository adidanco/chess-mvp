const pool = require("./db");

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Database connected:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
})();
