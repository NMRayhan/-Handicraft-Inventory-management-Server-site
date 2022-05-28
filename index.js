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
    return res.status(401).send({ message: "unAuthorize" });
  }
  jwt.verify(accessToken, process.env.ACCESS_TOKEN, (error, decode) => {
    if (error) {
      console.log(error);
      return res.status(403).send({ message: "forbidden" });
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
  const UserCollections = client.db("HandicraftDB").collection("Users");
  try {
    client.connect();

    // make user Admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decode.email;
      const requesterAccount = await UserCollections.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await UserCollections.updateOne(filter, updatedDoc);
        return res.send(result);
      }else{
        return res.status(403).send({message : "Forbidden User"})
      }
    });

    // remove user Admin
    app.put("/user/removeAdmin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "normal",
        },
      };
      const result = await UserCollections.updateOne(filter, updatedDoc);

      return res.send(result);
    });

    app.get('/admin/:email', async(req, res)=>{
      const email = req.params.email;
      const user = await UserCollections.findOne({email: email})
      const isAdmin = user.role === 'admin'
      res.send({admin: isAdmin})
    })

    // user update
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await UserCollections.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "12h",
      });
      return res.send({ result, token });
    });

    // all user
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await UserCollections.find().toArray();
      res.send(result);
    });

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
      const result = await UserReviewCollections.find().limit(6).toArray();
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
    app.delete("/review/:id", verifyJWT, async (req, res) => {
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
