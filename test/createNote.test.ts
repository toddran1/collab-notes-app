import request from "supertest";
import http from "http";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import bodyParser from "body-parser";
import cors from "cors";
import { schema } from "../src/index";
import { pool } from "../src/db";

jest.setTimeout(5000); // Allow enough time for setup

let server: http.Server;
let app: express.Express;
let testUserId: string;

beforeAll(async () => {
  app = express();
  const apollo = new ApolloServer({ schema });
  await apollo.start();

  app.use("/graphql", cors(), bodyParser.json(), expressMiddleware(apollo));

  server = app.listen(0); // Use random port
  const res = await pool.query(
    `INSERT INTO "User" (email, name, password) VALUES ($1, $2, $3) RETURNING id`,
    ["testuser@example.com", "Test User", "dummyhash"]
  );
  testUserId = res.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM "Note" WHERE "userId" = $1`, [testUserId]);
  await pool.query(`DELETE FROM "User" WHERE id = $1`, [testUserId]);
  server.close();
  await pool.end();
});

describe("createNote mutation", () => {
  it("should create a new note", async () => {
    const mutation = `
      mutation {
        createNote(title: "Test Note", content: "Test Content", userId: "${testUserId}") {
          id
          title
          content
          user {
            id
            email
          }
        }
      }
    `;

    const res = await request(app)
      .post("/graphql")
      .send({ query: mutation });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.createNote.title).toBe("Test Note");
    expect(res.body.data.createNote.user.id).toBe(testUserId);
  });
});
