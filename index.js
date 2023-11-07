// imports
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// express server initialization
const app = express();
const port = process.env.PORT || 5000;

// necessary middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://m-h-maruf-creative-chronicles.surge.sh',
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) =>{
    const token = req?.cookies?.token;
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
            return res.status(401).send({message: 'unauthorized access'})
        }
        req.user = decoded;
        next();
    })
}


// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cyycawz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        // creative chronicles database
        const creativeChroniclesDatabase = client.db('creativeChronicles');

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true});
        })

        // blogs collection
        const blogCollection = creativeChroniclesDatabase.collection('blogs');

        // get all blog data
        app.get('/blogs', verifyToken, async (req, res) => {
            const category = req.query.category;

            try {
                let query = {};

                if (category && category !== 'ALL') {
                    query.category = category;
                }

                const blogs = await blogCollection.find(query).toArray();
                res.json(blogs);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

        // get recent blog data
        app.get('/blogs/recent', async (req, res) => {
            try {
                const recentBlogs = await blogCollection.find().sort({ timestamp: -1 }).limit(6).toArray();
                res.send(recentBlogs);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get specific single blog data
        app.get('/blogs/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        });

        // get featured blog
        app.get('/blogsFeatured', verifyToken, async (req, res) => {
            try {
                const sortedBlogs = await blogCollection.find().sort({ descriptionLength: -1 }).limit(10).toArray();
                res.json(sortedBlogs);
            } catch (error) {
                console.error('Error fetching and sorting blogs:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // update specific single blog data
        app.put('/blogs/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updatedBlog = req.body;

            const updateDoc = {
                $set: {
                    ...updatedBlog,
                },
            };
            const result = await blogCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // add blog
        app.post('/blogs', verifyToken, async (req, res) => {
            const newBlog = req.body;
            const result = await blogCollection.insertOne(newBlog);
            res.send(result);
        });

        // newsletter collection
        const newsletterCollection = creativeChroniclesDatabase.collection('newsletters');

        // post newsletter email
        app.post("/newsletters/subscribe", async (req, res) => {
            const email = req.body;
            const result = await newsletterCollection.insertOne(email);
            res.send(result);
        });

        // wishlist collection
        const wishlistCollection = creativeChroniclesDatabase.collection('wishlist');

        // add to wishlist
        app.post('/wishlist', async (req, res) => {
            const blog = req.body;
            const result = await wishlistCollection.insertOne(blog);
            res.send(result);
        });

        // get user specific wishlist data
        app.get('/wishlist', async (req, res) => {
            const userEmail = req.query.email;
            console.log(userEmail);
            let query = {};
            query.userEmail = userEmail;

            const result = await wishlistCollection.find(query).toArray();
            console.log(result);
            res.send(result);
        });

        // remove from wishlist
        app.delete('/wishlist/:_id', verifyToken, async (req, res) => {
            const _id = req.params._id;
            const query = { _id: new ObjectId(_id) }
            const result = await wishlistCollection.deleteOne(query);
            res.send(result);
        })

        // comment collection
        const commentCollection = creativeChroniclesDatabase.collection('comments');

        // get comments for the blog
        app.get('/comments/:blogId', verifyToken, async (req, res) => {
            const { blogId } = req.params;

            try {
                const comments = await commentCollection.find({ blogId: blogId })
                    .sort({ timestamp: -1 }).toArray();
                res.json(comments);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // add comment
        app.post('/comments', verifyToken, async (req, res) => {
            const comment = req.body;
            const result = await commentCollection.insertOne(comment);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Crud is running...");
});

app.listen(port, () => {
    console.log(`Simple Crud is Running on port ${port}`);
});