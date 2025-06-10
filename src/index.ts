import express from "express";
import http from "http";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { gql } from "graphql-tag";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import bodyParser from "body-parser";

const prisma = new PrismaClient();

// PubSub implementation (lightweight, in-memory)
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();
const NOTE_ADDED = "noteAdded";

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

// --- Resolvers ---
const resolvers = {
  Query: {
    users: () => prisma.user.findMany({ include: { notes: true } }),
    notes: () => prisma.note.findMany({ include: { user: true } }),
  },
  Mutation: {
    createUser: (_: any, args: { email: string; name?: string }) =>
      prisma.user.create({ data: args }),
    createNote: async (_: any, args: { title: string; content: string; userId: string }) => {
      const createdNote = await prisma.note.create({ data: args });

        const fullNote = await prisma.note.findUnique({
        where: { id: createdNote.id },
        include: { user: true },
        });

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
    }
  }
};

// --- Create Schema and Server ---
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
  });

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
