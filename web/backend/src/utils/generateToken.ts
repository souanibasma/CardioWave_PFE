import jwt from "jsonwebtoken";

const generateToken = (id: string, role: string): string => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

export default generateToken;