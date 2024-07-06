const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const secret = "superMySecret";

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchasedCourse: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
});

const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Course = mongoose.model("Course", courseSchema);

const generateJwt = (user) => {
  const payload = { username: user };
  return jwt.sign(payload, secret, { expiresIn: "1h" });
};

const adminAuthJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(404);
  }
};

const userAuthJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(404);
  }
};

mongoose.connect("mongodb+srv://ash9821409015:5aExipQ9NX0h35Ck@cluster0.cfmf2yq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true });

app.get("/admin/me", adminAuthJwt, (req, res) => {
  res.json({
    username: req.user.username,
  });
});

app.post("/admin/signup", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username }).exec();
  if (admin) {
    res.status(403).json({ message: "Account already exists" });
  } else {
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    const token = jwt.sign({ username, role: "admin" }, secret, { expiresIn: "1h" });
    res.json({ message: "Admin created successfully", token });
  }
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.headers;
  const admin = await Admin.findOne({ username, password }).exec();
  if (admin) {
    const token = generateJwt(username);
    res.status(200).json({ message: "Logged In", token: token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});

app.post("/admin/courses", adminAuthJwt, async (req, res) => {
  const course = new Course(req.body);
  await course.save();
  res.json({ message: "Course is added successfully", courseId: course._id });
});

app.put("/admin/courses/:courseId", adminAuthJwt, async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, { new: true }).exec();
  if (course) {
    res.status(200).json({ message: "Course is updated", courseId: course._id });
  } else {
    res.status(403).json({ message: "Course not found" });
  }
});

app.get("/admin/courses", adminAuthJwt, (req, res) => {
  fs.readFile("courses.json", "utf-8", (err, data) => {
    if (err) throw err;
    const COURSES = JSON.parse(data);
    res.status(200).json(COURSES);
  });
});

app.post("/users/signup", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).exec();
  if (user) {
    res.status(403).json({ message: "User already exists" });
  } else {
    const newUser = new User({ username, password });
    await newUser.save();
    const token = generateJwt(username);
    res.status(200).json({ message: "New user is added", token: token });
  }
});

app.post("/users/login", async (req, res) => {
  const { username, password } = req.headers;
  const user = await User.findOne({ username, password }).exec();
  if (user) {
    const token = generateJwt(username);
    res.status(200).json({ message: "User Logged in", token: token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});

app.get("/users/courses", userAuthJwt, async (req, res) => {
  const courses = await Course.find({ published: true }).exec();
  if (courses) {
    res.json(courses);
  } else {
    res.status(403).json({ message: "No courses available for publication" });
  }
});

app.post("/users/courses/:courseId", userAuthJwt, async (req, res) => {
  const course = await Course.findById(req.params.courseId).exec();
  if (course) {
    const user = await User.findOne({ username: req.user.username }).exec();
    if (user) {
      user.purchasedCourse.push(course);
      await user.save();
      res.json({ message: "Course purchased successfully" });
    } else {
      res.json({ message: "User not found" });
    }
  } else {
    res.json({ message: "Course not found" });
  }
});

app.get("/users/purchasedCourses", userAuthJwt, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }).populate("purchasedCourse");
  if (user) {
    res.status(200).json({ Courses: user.purchasedCourse || [] });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000...");
});
