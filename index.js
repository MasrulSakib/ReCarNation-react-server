const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

const app = express()

//midddleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.SECRET_NAME}:${process.env.SECRET_PASSWORD}@cluster1.m4sihj5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }
});

async function run() {
    try {
        const carsCollection = client.db('ReCarNation').collection('carsCollection')
        const usersCollection = client.db('ReCarNation').collection('usersCollection')
        const bookingsCollection = client.db('ReCarNation').collection('bookingsCollection')

        app.get('/cars/:company', async (req, res) => {
            company = req.params.company
            const query = { company: company };
            const cars = await carsCollection.find(query).toArray()
            res.send(cars);

        })

        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const result = await bookingsCollection.insertOne(bookings);
            res.send(result);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })




    } finally {

    }
}
run().catch(error => console.error(error));



app.get('/', (req, res) => {
    res.send('recarnation is running successfully')
})

app.listen(port, () => {
    console.log(`ReCarNation is running on port ${port}`)
})