# 📖 Pixel&Pen

**Pixel&Pen** is a clean, modern, and responsive personal blogging platform built with Node.js, Express, PostgreSQL, and EJS. Designed for simplicity and ease of use, it offers a distraction-free reading and writing experience with a sleek, contemporary user interface.

---

## ✨ Features

- 📓 Personal blog creation, editing, and deletion
- 🔒 User authentication with secure password hashing (`bcryptjs`)
- 🧑‍💻 Clean and intuitive UI built with Bootstrap 5
- 📑 Individual blog pages with styled post previews
- 📱 Fully responsive layout for mobile and desktop
- ⚙️ Custom 404 error page and session-based access control
- 💾 PostgreSQL database integration for persistent, scalable storage

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, Bootstrap 5, EJS  
- **Backend**: Node.js, Express.js  
- **Database**: PostgreSQL  
- **Authentication**: `bcryptjs` for password hashing  
- **Templating Engine**: EJS  

---

## 📦 Install & Run Locally

### 1️⃣ Clone the repository:
```bash
git clone https://github.com/umeshrl9/Pixel-Pen.git
cd pixel-pen
```

### 2️⃣ Install dependencies:
```bash
npm install
```

### 3️⃣ Set up environment variables
Create a .env file in the root directory and add:
```bash
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_DATABASE=your_database_name
SECRET_KEY=your_session_secret
```

### 4️⃣ Start the server
```bash
node index.js
```



