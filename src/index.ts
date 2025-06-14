import express from "express";
import http from "http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { gql } from "graphql-tag";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import { Pool } from "pg";
import cors from "cors";
import bodyParser from "body-parser";
import { PubSub } from "graphql-subscriptions";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "fallbacksecret"; // for dev safety

// Hash password
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const isValidPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Sign JWT
const signToken = (user: any) => jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

const pubsub = new PubSub();
const NOTE_ADDED = "noteAdded";

// --- PostgreSQL Setup ---
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "collab_notes",
});

// --- GraphQL Schema ---
const typeDefs = gql`
  type User {
    id: String!
    email: String!
    name: String
    notes: [Note!]!
  }

  type Note {
    id: String!
    title: String!
    content: String!
    user: User!
  }

  type Query {
    users: [User!]!
    notes: [Note!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    email: String!
    name: String
    password: String!
  }

  type Mutation {
    register(input: RegisterInput): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createUser(email: String!, name: String): User! # (can later remove if replaced by register)
    createNote(title: String!, content: String!, userId: String!): Note!
  }

  type Subscription {
    noteAdded: Note
  }
`;

// --- GraphQL Resolvers ---
const resolvers = {
  Query: {
    users: async () => {
      const res = await pool.query(`SELECT * FROM "User"`);
      return res.rows;
    },
    notes: async () => {
      const res = await pool.query(`SELECT * FROM "Note"`);
      const notes = res.rows;

      const userIds = [...new Set(notes.map((n: any) => n.userId))];
      const usersRes = await pool.query(
        `SELECT id, email, name FROM "User" WHERE id = ANY($1::uuid[])`,
        [userIds]
        );
      const userMap = Object.fromEntries(usersRes.rows.map((u: any) => [u.id, u]));

      return notes.map((note: any) => ({
        ...note,
        user: userMap[note.userId],
      }));
    },
  },

  Mutation: {
    register: async (_: any, { input }: any) => {
        const { email, name, password } = input;
        const hashed = await hashPassword(password);
        const res = await pool.query(
            `INSERT INTO "User" (email, name, password) VALUES ($1, $2, $3) RETURNING *`,
            [email, name || null, hashed]
        );
        const user = res.rows[0];
        const token = signToken(user);
        return { token, user };
    },
    login: async (_: any, { email, password }: any) => {
        const res = await pool.query(`SELECT * FROM "User" WHERE email = $1`, [email]);
        const user = res.rows[0];
        if (!user) throw new Error("Invalid credentials");

        const valid = await isValidPassword(password, user.password);
        if (!valid) throw new Error("Invalid credentials");

        const token = signToken(user);
        return { token, user };
    },
    createUser: async (_: any, args: { email: string; name?: string }) => {
      const res = await pool.query(
        `INSERT INTO "User" (email, name) VALUES ($1, $2) RETURNING *`,
        [args.email, args.name || null]
      );
      return res.rows[0];
    },

    createNote: async (_: any, args: { title: string; content: string; userId: string }) => {
      const noteRes = await pool.query(
        `INSERT INTO "Note" (title, content, "userId") VALUES ($1, $2, $3) RETURNING *`,
        [args.title, args.content, args.userId]
      );
      const note = noteRes.rows[0];

      const userRes = await pool.query(
        `SELECT id, email, name FROM "User" WHERE id = $1`,
        [note.userId]
      );

      const fullNote = {
        ...note,
        user: userRes.rows[0],
      };

      console.log("🔥 fullNote before publish:", fullNote);

        await pubsub.publish("noteAdded", {
            noteAdded: fullNote,
        });

      return fullNote;
    },
  },

  Subscription: {
    noteAdded: {
      subscribe: () => (pubsub as any).asyncIterator(["noteAdded"]),
      resolve: (payload: any) => {
        console.log("🧪 Subscription received payload:", payload);
        return payload?.noteAdded ?? null;
        }
    },
  },

  User: {
    notes: async (parent: any) => {
      const res = await pool.query(
        `SELECT * FROM "Note" WHERE "userId" = $1`,
        [parent.id]
      );
      return res.rows;
    },
  },
};

// --- Server Setup ---
export const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer(port = 4000) {
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer({ schema }, wsServer);

  const server = new ApolloServer({ schema });
  await server.start();

  const getUserFromToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
        return null;
    }
  };

  app.use(
    "/graphql",
    cors(),
    bodyParser.json(),
    expressMiddleware(server, {
        context: async ({ req }) => {
        const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
        const user = token ? getUserFromToken(token) : null;
        return { user };
        },
    })
  );

  // Global error handler middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("💥 Unhandled Error:", err);
  res.status(500).json({
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Query endpoint: http://localhost:${PORT}/graphql`);
    console.log(`📡 Subscription endpoint: ws://localhost:${PORT}/graphql`);
  });
}

startServer();
