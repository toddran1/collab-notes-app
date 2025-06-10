import express from "express";
import { ApolloServer } from "apollo-server-express";
import { gql } from "apollo-server-core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
`;

const resolvers = {
  Query: {
    users: async () => await prisma.user.findMany({ include: { notes: true } }),
    notes: async () => await prisma.note.findMany({ include: { user: true } }),
  },
};

async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
  );
}

startServer();
