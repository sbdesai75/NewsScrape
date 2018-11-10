
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
var request = require("request");
require('dotenv').config()
console.log(process.env.MONGODB_URI)
var cheerio = require("cheerio");

mongoose.Promise = Promise;

// set the port of our application
// process.env.PORT lets the port be set by Heroku
const port = process.env.PORT || 5000;
//var PORT = process.env.PORT || 5000;

//app.listen(port, function() {

// Initialize Express
var app = express();

// Use body parser with our app
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set the view rendering middleware to use handlebars
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Get the mongoDB connection string from environment
var mongoConnect = process.env.MONGODB_URI;

// Database configuration with mongoose
mongoose.connect(mongoConnect);
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes
// ======

app.get("/", function(request, response) {
  response.render("index");
});

// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {

  // First, we grab the body of the html with request
  request("http://www.espn.com/", function(error, response, html) {

    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });
  });
  // Tell the browser that we finished scraping the text
  res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {


  // TODO: Finish the route so it grabs all of the articles
  Article.find({}, function(err, articles) {

    res.send(articles);
    console.log(articles);

  });

});

// This will grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {

  // TODO
  // ====

  // Finish the route so it finds one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included

  // Find the article by ID, populate the note
  Article.findOne( { "_id" : req.params.id }).
    populate("note").
    exec(function (err, article) {
        if (err) return console.log(err);
        res.send(article);
        console.log(article);
    });

});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {


  // TODO
  // ====
  const note = new Note(
    {
      "title" : "This is a new note",
      "body"  : "lorem ipsum"
    }
  );

  // save the new note that gets posted to the Notes collection
  note.save(function(err) {
    // we've saved the dog into the db here
    if (err) console.log(err);

    // Find the article by ID, populate the note
    // and update it's "note" property with the _id of the new note
    Article.findOne( { "_id" : req.params.id }).
      populate("note").
      exec(function (err, article) {
          if (err) return console.log(err);

          article.note = { type: note.id, ref: "Note" };
          article.save()
          article.populate("note");
          res.send(article);
          console.log(article);
      });
  });

});

// Listen on port 3000
app.listen(port, function() {
  console.log("App running on port: " + port);
});