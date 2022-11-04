import express from "express";
import dotenv from "dotenv";
import { MongoClient } from 'mongodb';
import cors from "cors";
import { userRouter } from "./routers/users.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;

app.use(express.json());
app.use(cors());

async function createConnection(){
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("Database connection established");
    return client;
}

export const client = await createConnection();

app.get('/', function (req, res) {
  res.send('Hello World')
});

app.use('/users', userRouter);

app.listen(PORT, console.log(`Server running at ${PORT}`));