const bcrypt = require("bcrypt");

const password = "aatithya123"; // Replace with the password you want to hash
bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    if (err) throw err;
    console.log("Hashed Password:", hash);
  });
});
