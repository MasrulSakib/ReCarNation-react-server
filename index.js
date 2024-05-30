const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET);
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


function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JSON_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const carsCollection = client.db('ReCarNation').collection('carsCollection')
        const usersCollection = client.db('ReCarNation').collection('usersCollection')
        const bookingsCollection = client.db('ReCarNation').collection('bookingsCollection')
        const paymentsCollection = client.db('ReCarNation').collection('payments')
        const reviewsCollection = client.db('ReCarNation').collection('reviewsCollection')

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query)
            if (user?.usertype !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden User' })
            }
            next();
        }

        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query)
            if (user?.usertype !== 'Buyer') {
                return res.status(403).send({ message: 'Forbidden User' })
            }
            next();
        }

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query)
            if (user?.usertype !== 'Seller') {
                return res.status(403).send({ message: 'Forbidden User' })
            }
            next();
        }

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.JSON_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/cars/:company', async (req, res) => {
            const company = req.params.company
            const query = { company: company };
            const cars = await carsCollection.find(query).toArray()
            res.send(cars);
        });

        app.post('/cars', verifyJWT, verifySeller, async (req, res) => {
            const cars = req.body;
            const result = await carsCollection.insertOne(cars);
            res.send(result)
        });

        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const result = await bookingsCollection.insertOne(bookings);
            res.send(result);
        });

        app.get('/dashboard/seller/myproducts', verifyJWT, verifySeller, async (req, res) => {
            const email = req.query.email;
            const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/dashboard/seller/myproducts/advertise/:id', (req, res) => {
            const id = req.params.id;
            const { advertise } = req.body;
            carsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { advertise } })
                .then(result => {
                    res.send(result);
                });
        });

        app.get('/dashboard/advertisedCars', async (req, res) => {
            const query = { advertise: true }
            const result = await carsCollection.find(query).toArray()
            res.send(result)
        });

        app.delete('/dashboard/seller/myproducts/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await carsCollection.deleteOne(query)
            res.send(result);
        })

        app.get('/bookings', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        app.delete('/bookings/:id', verifyJWT, verifyBuyer, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(query)
            res.send(result);
        });

        app.get('/dashboard/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const car = await bookingsCollection.findOne(query)
            res.send(car);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        });

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
            const user = await usersCollection.findOne(query)
            res.send({ isBuyer: user?.usertype === 'Buyer' });
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
            const user = await usersCollection.findOne(query)
            res.send({ isSeller: user?.usertype === 'Seller' });
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.usertype === 'Admin' });
        });

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const query = { usertype: { $in: ["Buyer", "Seller"] } };
                const users = await usersCollection.find(query).toArray();
                res.send(users);
            } catch (error) {
                console.error('Error fetching users:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.get('/users/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            try {

                const query = { usertype: 'Buyer' };
                const buyers = await usersCollection.find(query).toArray();
                // console.log('Buyers:', buyers);
                res.send(buyers);
            } catch (error) {
                console.error('Error fetching buyers:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.get('/users/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            try {

                const query = { usertype: 'Seller' };
                const sellers = await usersCollection.find(query).toArray();
                // console.log('Sellers:', sellers);
                res.send(sellers);
            } catch (error) {
                console.error('Error fetching sellers:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.delete('/user/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const users = await usersCollection.deleteOne(query)
            res.send(users);
        });

        app.put('/users/status/:email', verifyJWT, verifyAdmin, async (req, res) => {
            try {
                const email = req.params.email;
                const filter = { email: { $regex: new RegExp(`^${email}$`, 'i') } };
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        status: 'verified'
                    }
                };
                const carsResult = await carsCollection.updateOne(filter, updatedDoc, options);
                const usersResult = await usersCollection.updateOne(filter, updatedDoc, options);

                res.send({ carsResult, usersResult });
            } catch (error) {
                res.status(500).send({ message: 'An error occurred', error });
            }
        });

        app.get('/dashboard/reportedcars/post', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { post: 'reported' }
            const cars = await carsCollection.find(query).toArray()
            res.send(cars)
        })

        app.delete('/dashboard/reportedcars/post/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const post = await carsCollection.deleteOne(query)
            res.send(post);
        })

        app.put('/reportedcars/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const reportedCars = {
                $set: {
                    post: 'reported'
                }
            };
            const result = await carsCollection.updateOne(filter, reportedCars, options);
            res.send(result);
        });


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            };
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.sellingPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.get('/reviews', async (req, res) => {
            try {
                const reviews = await reviewsCollection.find().toArray();
                res.send(reviews);
            } catch (error) {
                res.status(500).send({ message: 'An error occurred', error });
            }
        });

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