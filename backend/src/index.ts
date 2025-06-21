import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import cookie from "cookie-parser";
import router from "./routes/index";
import path from "path";
import bodyParser from "body-parser";
import '../src/jobs/deleteExpiredTrash';

mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string);
if(mongoose.connection) {
  console.log("Connected to MongoDB");
}
const app = express();

app.use(cors());
app.use(cookie());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json({ limit: "50mb" })); // Tăng giới hạn JSON
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Static middleware để phục vụ các file trong thư mục `public`
app.use("/public", express.static(path.join(__dirname, "public")));

router(app);

app.listen(7000, () => {
  console.log(`Server is running on port 7000`);
});
