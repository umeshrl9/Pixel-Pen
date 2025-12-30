CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  google_id TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'local'
);


CREATE TABLE blogs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);