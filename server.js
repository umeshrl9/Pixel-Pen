import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import passport from "passport";
import upload from "./config/multer.js";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cloudinary from "./config/cloudinary.js";

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
app.use(passport.initialize());

app.set('view engine', 'ejs');

app.use(async (req, res, next) => {
    const token = req.cookies.token;

    if(!token){
        res.locals.currentUser = null;
        return next();
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await pool.query(
            "SELECT id, username, profile_picture FROM users WHERE id=$1", [decoded.userId]
        );

        res.locals.currentUser = result.rows[0] || null;
    } catch(err){
        res.locals.currentUser = null;
    }

    next();
})

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_REDIRECT_URI
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails[0].value;

                let user = await pool.query(
                    "SELECT * FROM USERS WHERE google_id = $1", [googleId]
                );

                if (user.rows.length === 0) {
                    user = await pool.query(
                        `INSERT INTO users(email, google_id, auth_provider)
                VALUES ($1, $2, 'google')
                RETURNING *`,
                        [email, googleId]
                    );
                }

                return done(null, user.rows[0]);
            } catch (err) {
                return done(err, null);
            }
        })
);

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

function getPublicId(url){
  const parts = url.split("/");
  const file = parts.pop();
  const folder = parts.pop();
  const publicId = file.split(".")[0];
  return `${folder}/${publicId}`;
}   


app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || username.trim().length === 0) {
        return res.render("auth", { error: "Username cannot be empty", activeTab: "register", oldInput: { username } });
    }

    if (!password || password.length < 6) {
        return res.render("auth", { error: "Password must atleast be 6 characters", activeTab: "register", oldInput: { username } });
    }

    try {
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.render("auth", { error: "Username already taken", activeTab: "register", oldInput: { username } });
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

    if (!username || !password) {
    return res.render("auth", {
      error: "Please enter both username and password",
      activeTab: "login",
      oldInput: {username}
    });
  }

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE username LIKE $1",
            [username]
        );

        if (result.rows.length > 0) {
            const storedHash = result.rows[0].password;
            const isMatch = await bcrypt.compare(password, storedHash);

            if (isMatch) {
                const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "7d" });

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });

                res.redirect("/main");
            } else {
                return res.render("auth", { error: "Wrong password", activeTab: "login", oldInput: { username } });
            }
        } else {
            return res.render("auth", { error: "No account exists with the given username", activeTab: "login", oldInput: { username } });
        }
    } catch (err) {
        console.log(err);
        res.render("message", {
            errorHeading: "Server Error",
            message: "Something went wrong. Please try again later."
        });
    }
})

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    session: false
}));

app.get("/auth/google/callback", passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth"
}), (req, res) => {
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect("/main");
});


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

app.get("/profile", authenticateToken, async (req, res) => {
    try{
        const result = await pool.query(
            "SELECT username, name, bio, profile_picture, website, location FROM users WHERE id = $1", [req.userId]
        );

        const user = result.rows[0];

        const resultBlogs = await pool.query(
            "SELECT * FROM blogs WHERE user_id = $1 ORDER BY id DESC",
            [req.userId]
        );

        

        res.render("profile.ejs", {
            user: user,
            blogs: resultBlogs.rows
        });
    } catch(err){
        console.err(err);
        res.status(500).render("message", {
            errorHeading: "500",
            message: "Error Loading Profile"
        });
    }
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

app.post("/edit-profile", authenticateToken, upload.single("profile_picture"), async (req, res) => {
  const { name, bio, website, location, remove_avatar } = req.body;

  try{
    const result = await pool.query(
        "SELECT profile_picture FROM users WHERE id=$1",
        [req.userId]
    );

    const oldImage = result.rows[0].profile_picture;

    if(oldImage && (req.file || remove_avatar === "true")){
        const publicId = getPublicId(oldImage);
        await cloudinary.uploader.destroy(publicId);
    }

    let profilePictureUrl = oldImage;

    if(req.file){
        profilePictureUrl = req.file.path;
    }

    if(remove_avatar === "true"){
        profilePictureUrl = null;
    }

    await pool.query(
        "UPDATE users SET name=$1, bio=$2, website=$3, location=$4, profile_picture=$5 WHERE id=$6",
        [name, bio, website, location, profilePictureUrl, req.userId]
    );

    res.redirect("/profile");
  } catch(err){
    console.error(err);
    res.status(500).send("Error updating profile");
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

app.post("/delete-account", authenticateToken, async (req, res) => {
    try{
        await pool.query(
            "DELETE FROM users WHERE ID=$1", [req.userId]
        );

        res.clearCookie("token");

        res.locals.currentUser = null;
        res.render("message", {
            errorHeading: "Account Deleted  Successfully!",
            message: "Your account and all associated blogs have been permanently deleted."
        });
    } catch(err){
        console.error(err);
        res.status(500).render("message", {
            errorHeading: "Server Error",
            message: "Unable to delete, please try again"
        });
    }
});

app.get("/auth", (req, res) => {
    const token = req.cookies.token;
    if (token) {
        return res.redirect("/main");
    }
    res.render("auth", { error: null, activeTab: "login", oldInput: {} });
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
