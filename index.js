import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";

const app = express();
dotenv.config();
const port = process.env.PORT || 3000;

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/auth");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.redirect("/auth");
    }
};


app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.render("message", { errorHeading: "Oh no!", message: "Username Already Taken" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING ID",
            [username, hashedPassword]
        );

        const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect("/main");
    } catch (err) {
        console.log(err);
        res.render("message", {
            errorHeading: "Server Error",
            message: "Something went wrong. Please try again later."
        });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE username LIKE $1",
            [username]
        );

        if (result.rows.length > 0) {
            const storedHash = result.rows[0].password;
            const isMatch = await bcrypt.compare(password, storedHash);

            if (isMatch) {
                const token = jwt.sign({userId: result.rows[0].id}, process.env.JWT_SECRET, {expiresIn: "7d"});
                
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });

                res.redirect("/main");
            } else {
                return res.render("message", { errorHeading: "Oh no!", message: "Wrong password" });
            }
        } else {
            return res.render("message", { errorHeading: "Oh no!", message: "No account exists with the given username" });
        }
    } catch (err) {
        console.log(err);
        res.render("message", {
            errorHeading: "Server Error",
            message: "Something went wrong. Please try again later."
        });
    }
})

app.get("/main", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM blogs WHERE user_id = $1 ORDER BY id DESC",
            [req.userId]
        );

        res.render("main.ejs", {
            blogs: result.rows
        });
    } catch (err) {
        console.log(err);
        res.status(500).render("message", { errorHeading: "500", message: "Error Fetching Blogs" });
    }
});

app.get("/create", authenticateToken, (req, res) => {
    res.render("createBlog.ejs");
});

app.post('/create', authenticateToken, async (req, res) => {
    const { title, content } = req.body;

    try {
        await pool.query(
            "INSERT INTO blogs (title, content, user_id) VALUES ($1, $2, $3)",
            [title, content, req.userId]
        );

        res.redirect("/main");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating blog");
    }
});

app.get('/blogs/:id', authenticateToken, async (req, res) => {
    const blogID = req.params.id;

    try {
        const result = await pool.query(
            "SELECT * FROM blogs WHERE id = $1 AND user_id = $2",
            [blogID, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).render("message", { errorHeading: "Oh no!", message: "Blog Not Found or Unauthorized" });
        }

        const blog = result.rows[0];
        res.render('blog', { blog });
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error while fetching blog");
    }
});

app.get('/edit/:id', authenticateToken, async (req, res) => {
    const blogID = req.params.id;

    try {
        const result = await pool.query(
            "SELECT * FROM blogs WHERE id = $1 AND user_id = $2",
            [blogID, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).render("message", { errorHeading: "Oh no!", message: "Blog Not Found or Unauthorized" });
        }

        const blog = result.rows[0];
        res.render('edit', { blog });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error while fetching blog for edit");
    }
});

app.post('/edit/:id', authenticateToken, async (req, res) => {
    const blogID = req.params.id;
    const { title, content } = req.body;

    try {
        const result = await pool.query(
            "SELECT * FROM blogs WHERE id = $1 AND user_id = $2",
            [blogID, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("Blog not found or unauthorized");
        }

        await pool.query(
            "UPDATE blogs SET title = $1, content = $2 WHERE id = $3 AND user_id = $4",
            [title, content, blogID, req.userId]
        );

        res.redirect('/main');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error while updating blog");
    }
});

app.post('/delete', authenticateToken, async (req, res) => {
    const blogID = req.body.id;

    try {
        // Check if the blog exists and belongs to the current user
        const result = await pool.query(
            "SELECT * FROM blogs WHERE id = $1 AND user_id = $2",
            [blogID, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("Blog not found or unauthorized");
        }

        // Delete the blog from the database
        await pool.query(
            "DELETE FROM blogs WHERE id = $1 AND user_id = $2",
            [blogID, req.userId]
        );

        res.redirect("/main");

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error while deleting blog");
    }
});

app.get("/auth", (req, res) => {
    const token = req.cookies.token;
    if(token){
        return res.redirect("/main");
    }
    res.render("auth.ejs");
});


app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect("/auth");
});

app.use((req, res) => {
    res.status(404).render("message", { errorHeading: "404 - Page Not Found", message: "The page you are looking for does not exist" });
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
