# 📝 Collab Notes Backend (GraphQL API)

This is the backend of the Collab Notes application built with:

- Node.js + Express
- TypeScript
- Apollo Server (GraphQL)
- PostgreSQL (manual queries via `pg`)
- JWT authentication
- WebSocket-based GraphQL subscriptions
- Winston logging
- Global error handling middleware

---

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/collab-notes-app.git
cd collab-notes-app
npm install
```

### 2. Set Up PostgreSQL

Create a PostgreSQL database and run the following SQL:

```sql
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "Note" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "userId" UUID REFERENCES "User"(id)
);
```

If using Docker Compose, your `.env` or container should use:

```
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=collab_notes
JWT_SECRET=yourStrongSecret
```

### 3. Run the Server

```bash
npm run dev
```

---

## 📡 Endpoints

- **GraphQL API:** `http://localhost:4000/graphql`
- **Subscriptions:** `ws://localhost:4000/graphql`

---

## 🧪 GraphQL Operations

### 🔐 Register

```graphql
mutation {
  register(RegisterInput: {
    email: "new@example.com",
    name: "New User",
    password: "securepassword"
  }) {
    token
    user {
      id
      email
    }
  }
}
```

---

### 🔐 Login

```graphql
mutation {
  login(email: "new@example.com", password: "securepassword") {
    token
    user {
      id
      email
    }
  }
}
```

Include the token in headers for authenticated requests:

```
Authorization: Bearer <your_token>
```

---

### 👤 Create User (Legacy)

```graphql
mutation {
  createUser(email: "test@example.com", name: "Tester") {
    id
    email
    name
  }
}
```

---

### 📝 Create Note

```graphql
mutation {
  createNote(title: "Test Note", content: "Hello world", userId: "<user_id>") {
    id
    title
    content
    user {
      id
      email
    }
  }
}
```

---

### 🔍 Query All Users

```graphql
query {
  users {
    id
    email
    name
    notes {
      id
      title
    }
  }
}
```

---

### 🔍 Query All Notes

```graphql
query {
  notes {
    id
    title
    content
    user {
      id
      email
    }
  }
}
```

---

### 📡 Subscription: noteAdded

```graphql
subscription {
  noteAdded {
    id
    title
    content
    user {
      email
    }
  }
}
```

> Run the subscription first, then trigger by creating a new note.

---

## 🧪 Run Tests

```bash
npm run test
```

Includes unit test for `createNote` mutation using `jest` and `supertest`.

---

## 🛡️ Security & Middleware

- JWT token is validated in `context`.
- Global error handler catches unhandled exceptions.
- Winston logger logs API activity and errors.

---

## 📂 Project Structure

```
src/
│
├── index.ts             # Main entry with GraphQL server + middleware
├── db.ts                # Pool configuration
├── logger.ts            # Winston logger setup
└── tests/
    └── createNote.test.ts
```

---

## 📋 TODO / Enhancements

- Add more unit and integration tests
- Rate limiting / input sanitization
- Refresh tokens / password reset
- Pagination and filtering for notes
- Role-based access control

---

## Docker commands
  ✅ Build and Start the Project

    docker-compose up --build
  
  ✅ Start Containers Without Rebuilding
  
    docker-compose up
  
  ✅ Run in Detached Mode (in the background)
  
    docker-compose up -d
  
  🛑 Stop Containers
  
  docker-compose down
  
  🔄 Rebuild Containers
  
  docker-compose build
  
  🧹 Remove All Containers, Volumes, and Networks
  
  docker-compose down -v
  
  🐘 PostgreSQL Commands Inside the Container
  🛠️ Access PostgreSQL Container Shell
  
  docker exec -it <db_container_name> bash
  
  🐘 Access psql Inside the Container
  
  psql -U postgres -d collab_notes
  Or directly from host (if using Docker Compose service names):

  docker-compose exec db psql -U postgres -d collab_notes

