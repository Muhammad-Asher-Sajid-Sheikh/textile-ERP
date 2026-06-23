import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Decimal } from '@prisma/client/runtime/client.js';
import { PrismaClient } from "../generated/client.js";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;