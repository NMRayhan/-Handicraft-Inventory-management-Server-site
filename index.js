const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  const ProductCollection = client.db("HandicraftDB").collection("Products");
  const OrdersCollection = client.db("HandicraftDB").collection("Orders")
  try {
    client.connect();

    //app product showing
    app.get("/products", async (req, res) => {
      const products = await ProductCollection.find({}).toArray();
      res.send(products);
    });

    //get one product
    app.get('/purchase/:_id', async(req, res)=>{
        const id = req.params._id
        const query = {_id: ObjectId(id)}
        const result = await ProductCollection.findOne(query)
        res.send(result)
    })

    // submit Customer order 
    app.post('/purchase', async(req, res)=>{
        const Order = req.body
        const result = await OrdersCollection.insertOne(Order)
        res.send(result);
    })
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
