import bcrypt from "bcryptjs";

const run = async () => {
  const hash = await bcrypt.hash("123456", 10);
  console.log(hash);
};

run();