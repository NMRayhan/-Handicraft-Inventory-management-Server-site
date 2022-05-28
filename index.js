const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ydpt4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeaders = req.headers.authorization;
  const accessToken = authHeaders.split(" ")[1];
  if (!authHeaders) {
    res.status(401).send({ message: "unAuthorize" });
  }
  jwt.verify(accessToken, process.env.ACCESS_TOKEN, (error, decode) => {
    if (error) {
      res.status(403).send({ message: "forbidden" });
    }
    req.decode = decode;
    next();
  });
};

async function run() {
  const ProductCollection = client.db("HandicraftDB").collection("Products");
  const OrdersCollection = client.db("HandicraftDB").collection("Orders");
  const UserQuestionCollections = client
    .db("HandicraftDB")
    .collection("ContactUs");
  const UserReviewCollections = client.db("HandicraftDB").collection("Reviews");
  try {
    client.connect();

    //app product showing
    app.get("/products", async (req, res) => {
      const products = await ProductCollection.find({}).toArray();
      res.send(products);
    });

    //get one product
    app.get("/purchase/:_id", async (req, res) => {
      const id = req.params._id;
      const query = { _id: ObjectId(id) };
      const result = await ProductCollection.findOne(query);
      res.send(result);
    });

    // submit Customer order
    app.post("/purchase", async (req, res) => {
      const Order = req.body;
      const quantity = parseInt(Order.quantity);
      const id = Order.productId;
      const filter = { _id: ObjectId(id) };
      const Options = { upsert: true };
      const productCursor = await ProductCollection.findOne(filter);
      const newStock = productCursor.stock - quantity;
      const updatedProduct = {
        $set: { stock: newStock },
      };
      await ProductCollection.updateOne(filter, updatedProduct, Options);

      const result = await OrdersCollection.insertOne(Order);
      res.send(result);
    });

    // customer orders showing Dashboard for user
    app.get("/orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { customer_email: email };
      const result = await OrdersCollection.find(query).toArray();
      res.send(result);
    });

    //submit ask from contact us page
    app.post("/ask", async (req, res) => {
      const Order = req.body;
      const result = await UserQuestionCollections.insertOne(Order);
      res.send(result);
    });

    // submit Customer Review
    app.post("/review", async (req, res) => {
      const Order = req.body;
      const result = await UserReviewCollections.insertOne(Order);
      res.send(result);
    });

    //get all review for home page
    app.get("/review", async (req, res) => {
      const result = await UserReviewCollections.find().toArray();
      // .limit(3)
      res.send(result);
    });

    // get customer review filter by user
    app.get("/review/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { reviewEmail: email };
      const result = await UserReviewCollections.find(filter).toArray();
      res.send(result);
    });

    //delete user review by user
    app.put("/review/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await UserReviewCollections.deleteOne(filter);
      res.send(result);
    });
  } finally {
    // client.close()
  }
}

run().catch(console.dir);

//testing
app.get("/", (req, res) => {
  res.send("Hello from Server");
});

app.listen(port, () => {
  console.log("Listening from ", port);
});
