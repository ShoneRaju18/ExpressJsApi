import bcrypt from "bcrypt"

// Prisma middleware to hash password before saving
// const prisma = new PrismaClient().$extends({
//     query: {
//       user: {
//         async create({ args, query }) {
//           // Hash the password before creating the user
//           if (args.data.password) {
//             const saltRounds = 10;
//             args.data.password = await bcrypt.hash(args.data.password, saltRounds);
//           }
//           return query(args); // Proceed with the original query
//         },
//         async update({ args, query }) {
//           // Hash the password before updating the user
//           if (args.data.password) {
//             const saltRounds = 10;
//             args.data.password = await bcrypt.hash(args.data.password, saltRounds);
//           }
//           return query(args); // Proceed with the original query
//         }
//       }
//     }
//   });

const userMiddleware = {
  async create({ args, query }) {
    if (args.data.password) {
      const saltRounds = 10;
      args.data.password = await bcrypt.hash(args.data.password, saltRounds);
    }
    return query(args);
  },
  async update({ args, query }) {
    if (args.data.password) {
      const saltRounds = 10;
      args.data.password = await bcrypt.hash(args.data.password, saltRounds);
    }
    return query(args);
  }
};

export { userMiddleware }