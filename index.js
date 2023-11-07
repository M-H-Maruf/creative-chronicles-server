// imports
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// express server initialization
const app = express();
const port = process.env.PORT || 5000;

// necessary middlewares
app.use(cors());
app.use(express.json());

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

        // blogs collection
        const blogCollection = creativeChroniclesDatabase.collection('blogs');

        // get all blog data
        app.get('/blogs', async (req, res) => {
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
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        });

        // get featured blog
        app.get('/blogs-featured', async (req, res) => {
            try {
                const sortedBlogs = await blogCollection.find().sort({ descriptionLength: -1 }).limit(10).toArray();
                res.json(sortedBlogs);
            } catch (error) {
                console.error('Error fetching and sorting blogs:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // update specific single blog data
        app.put('/blogs/:id', async (req, res) => {
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
        app.post('/blogs', async (req, res) => {
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
            let query = {};
            query.userEmail = userEmail;

            const result = await wishlistCollection.find(query).toArray();
            res.send(result);
        });

        // remove from wishlist
        app.delete('/wishlist/:_id', async (req, res) => {
            const _id = req.params._id;
            const query = { _id: new ObjectId(_id) }
            const result = await wishlistCollection.deleteOne(query);
            res.send(result);
        })

        // comment collection
        const commentCollection = creativeChroniclesDatabase.collection('comments');

        // get comments for the blog
        app.get('/comments/:blogId', async (req, res) => {
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
        app.post('/comments', async (req, res) => {
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