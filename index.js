import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";

const app = express();
const port = 3000;
dotenv.config();

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.static("public"));  
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');


app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/main", async (req, res) => {
    if(!req.session.userID){
        return res.redirect("/auth");
    }

    try{
        const result = await pool.query(
            "SELECT * FROM blogs WHERE user_id = $1 ORDER BY id DESC",
            [req.session.userID]
        );

        res.render("main.ejs", {
            blogs: result.rows
        });
    } catch (err){
        console.log(error);
        res.status(500).send("Error fetching blogs");
    }   
});

app.get("/create", (req, res) => {
    if(!req.session.userID){
        return res.redirect("/auth");
    }

    res.render("createBlog.ejs");
});

app.get("/auth", (req, res) => {
    if(!req.session.userID){
        res.render("auth.ejs");
    } else{
        res.redirect("/main");
    }
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try{
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE username = $1", 
            [username]
        );

        if(existingUser.rows.length > 0){
            return res.send("Username already taken");
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING ID",
            [username, hashedPassword]
        );

        req.session.userID = result.rows[0].id;
        res.redirect("/main");
    } catch (err){
        console.log(err);
        res.redirect("/auth");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try{
        const result = await pool.query(
            "SELECT * FROM users WHERE username LIKE $1",
            [username]
        );

        if(result.rows.length > 0){
            const storedHash = result.rows[0].password;
            const isMatch = await bcrypt.compare(password, storedHash);

            if(isMatch){
                req.session.userID = result.rows[0].id;
                res.redirect("/main");
            } else{
                return res.send("Wrong Password");
            }
        } else{
            return res.send("No account exists with the given username");
        }
    } catch (err) {
        console.log(err);
        res.redirect("/auth");
    }
})

app.post('/create', async (req, res) => {
    if(!req.session.userID){
        return res.redirect("/auth");
    }

    const { title, content } = req.body;

    try{
        await pool.query(
            "INSERT INTO blogs (title, content, user_id) VALUES ($1, $2, $3)",
            [title, content, req.session.userID]
        );

        res.redirect("/main");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating blog");
    }
});

app.get('/blogs/:id', (req, res) => {
    const blog = blogs.find(b => b.id == req.params.id);
    if (blog) {
        res.render('blog', { blog });
    } else {
        res.status(404).send('Blog not found');
    }
});

app.get('/edit/:id', (req, res) => {
    const blog = blogs.find(b => b.id == req.params.id);
    if (blog) {
        res.render('edit', { blog });
    } else {
        res.status(404).send('Blog not found');
    }
});

app.post('/edit/:id', (req, res) => {
    const blog = blogs.find(b => b.id == req.params.id);
    if (blog) {
        blog.title = req.body.title;
        blog.content = req.body.content;
        res.redirect('/main'); // Redirect to homepage or updated blog view
    } else {
        res.status(404).send('Blog not found');
    }
});

app.post('/delete', (req, res) => {
    const itemId = req.body.id;
    // Find the item and remove it
    const index = blogs.findIndex(item => item.id === parseInt(itemId));

    if (index !== -1) {
        blogs.splice(index, 1);  // Remove item from array
        res.render('main', { blogs: blogs });
    } else {
        res.status(404).send('Blog not found');
    }
});


app.listen(port, () => {
    console.log("Server running on port: " + port); 
});
