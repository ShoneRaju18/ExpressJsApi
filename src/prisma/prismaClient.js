import { PrismaClient } from "@prisma/client";
import { userMiddleware } from "../middlewares/user.middleware.js";


const prisma = new PrismaClient().$extends({
    query: {
      user: userMiddleware,    // User-specific middleware
    }
  });
  
export { prisma };