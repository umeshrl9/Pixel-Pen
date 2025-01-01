import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(express.static("public"));  
app.use(bodyParser.urlencoded({extended: true}));

var blogs = [];

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/main", (req, res) => {
    res.render("main.ejs", {
        blogTitles: blogTitlesArray
    });
})

app.get("/create", (req, res) => {
    res.render("createBlog.ejs");
});

app.post('/create', (req, res) => {
    const newBlog = {
        id: Date.now(), // Unique identifier
        title: req.body.title,
        content: req.body.content,
    };
    blogs.push(newBlog);
    res.redirect('/'); 
    console.log(blogs);
});

app.listen(port, () => {
    console.log("Server running on port: " + port); 
});
