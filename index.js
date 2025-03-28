import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(express.static("public"));  
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');


app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/main", (req, res) => {
    res.render("main.ejs", {
        blogs: blogs
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
    res.redirect('/main'); 
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
