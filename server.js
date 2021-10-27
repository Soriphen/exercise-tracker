const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(
  "/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css"))
);
app.use(
  "/js",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/js"))
);
app.use(express.static(path.join(__dirname + "/public/styles")));
app.use(express.urlencoded({ extended: false }));

/* ------------------------------MongoDB------------------------------ */
mongoose.connect(process.env["MONGO_URI"], {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let { Schema, model } = mongoose;

let exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

let userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema]
});

let User = new model("user", userSchema);

/* You can POST to /api/users with form data username to create a new user. */
function postUser(req, res) {
  let newUser = new User({ username: req.body.username });
  newUser.save((error, savedUser) => {
    if (!savedUser) {
      throw new Error("savedUser is undefined");
    }
    if (error) {
      return console.log(error.message);
    }

    res.json({ username: savedUser.username, _id: savedUser._id });
  });
}

function getUser(req, res) {
  User.find({})
    .select("-__v")
    .exec((error, usersArr) => {
      if (!usersArr) {
        throw new Error("usersArr is undefined");
      }

      if (error) {
        return console.log(error.message);
      }

      res.json(usersArr);
    });
}

/* You can POST to /api/users/:_id/exercises with form data description, 
duration, and optionally date. If no date is supplied, 
the current date will be used. */
function postExercise(req, res) {
  let userId = req.params._id || req.body._id;
  let exerciseObj = {
    description: req.body["description"],
    duration: parseInt(req.body["duration"], 10),
    date: !req.body["date"]
      ? new Date().toISOString().match(/([0-9-]+)(?=T)/)[0]
      : req.body["date"]
  };

  User.findByIdAndUpdate(userId, { $push: { log: exerciseObj } }, { new: true })
    .then((updatedUser) => {
      if (!updatedUser) {
        return res.status(404).json({ error: "Not found" });
      }
      let returnObj = {
        _id: userId,
        username: updatedUser.username,
        description: exerciseObj.description,
        duration: exerciseObj.duration,
        date: new Date(exerciseObj.date).toDateString()
      };
      res.json(returnObj);
    })
    .catch((error) => {
      return console.log(error);
    });
}

function getLog(req, res) {
  let userId = req.params._id;
  let dateFrom = req.query.from || "0000-00-00";
  let dateTo = req.query.to || "9999-99-99";

  User.findById(userId)
    .then((result) => {
      if (!result) {
        return res.status(404).json({ error: "Not found" });
      }
      // The result document object is converted to JSON to allow modifications
      result = result.toJSON();

      /* limit query */
      if (req.query.limit) {
        result.log = result.log.slice(0, req.query.limit);
      }

      /* from and to queries */
      let newLog = result.log.filter((log) => {
        return log.date >= dateFrom && log.date <= dateTo;
      });

      result.log = newLog;

      result.count = result.log.length;

      res.json(result);
    })
    .catch((error) => {
      return console.log(error);
    });
}

/* ------------------------------Main API------------------------------ */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", postUser);
app.get("/api/users", getUser);

app.post("/api/users/:_id/exercises", postExercise);

app.get("/api/users/:_id/logs", getLog);

/* ------------------------------Listener------------------------------ */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
