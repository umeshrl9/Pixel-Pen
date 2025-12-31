# Pixel&Pen

**Pixel&Pen** is a clean, modern, and responsive personal blogging platform built with Node.js, Express, PostgreSQL, and EJS. Designed for simplicity and ease of use, it offers a distraction-free reading and writing experience with a sleek, contemporary user interface.

---

##  Features

- Personal blog creation, editing, and deletion
- User authentication with secure password hashing (`bcryptjs`)
- Supports Google's OAuth Secure Login
- Clean and intuitive UI built with Bootstrap 5
- Individual blog pages with styled post previews
- Fully responsive layout for mobile and desktop
- Custom 404 error page and persistent-access using JWTs (JSON Web Tokens)
- PostgreSQL database integration for persistent, scalable storage

---

##  Tech Stack

- **Frontend**: EJS (SSR), HTML, CSS, Bootstrap 5
- **Backend**: Node.js, Express.js  
- **Database**: PostgreSQL  

---

## Install & Run Locally

### 1️) Clone the repository:
```bash
git clone https://github.com/umeshrl9/Pixel-Pen.git
cd pixel-pen
```

### 2️) Install dependencies:
```bash
npm install
```

### 3️) Set up environment variables
Create the database in PostgreSQL and create your account in Google Cloud Console for OAuth and gather the following details to be put in the environment file.
Create a .env file in the root directory and add:
```bash
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_DATABASE=your_database_name
JWT_SECRET=your_secret_key_for_JWT
NODE_ENV = development
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GOOGLE_REDIRECT_URI = your_google_redirect_uri
```

### 4) Start the server
```bash
node server.js
```



