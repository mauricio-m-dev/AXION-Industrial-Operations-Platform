db.users.updateOne(
  { matricula: "0000000" },
  { $set: { email: "axion.technology@gmail.com" } }
);
