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

  type Mutation {
    createUser(email: String!, name: String): User!
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
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer({ schema }, wsServer);

  const server = new ApolloServer({ schema });
  await server.start();

  app.use(
    "/graphql",
    cors(),
    bodyParser.json(),
    expressMiddleware(server)
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Query endpoint: http://localhost:${PORT}/graphql`);
    console.log(`📡 Subscription endpoint: ws://localhost:${PORT}/graphql`);
  });
}

startServer();
