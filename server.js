const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const shortid = require('shortid');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI);

var schema = new mongoose.Schema({
  _id: {
    type: String,
    'default': shortid.generate
  },
  user: String,
  exercises: [
    {
      description: String,
      duration: Number,
      date: Date,
      _id: false
    }
  ]
});

var User = mongoose.model('User', schema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//My code
app.get('/api/all', (req, res) => {
  User.find({}, function(err, users) {
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(users, null, 4));
  });
});

app.post('/api/exercise/new-user', (req, res) => {
  var newUser = new User({user: req.body.username})
  newUser.save(function(err) {
    if (err) return console.log(err);
    res.send('New user added: name - '+req.body.username+'</br> user id - '+newUser.id);
  })
});

app.post('/api/exercise/add', (req, res) => {
  User.findOne({"_id": req.body.userId}, function(err, user) {
    if(err) console.log(err);
    var newExercise = {
      description: req.body.description,
      duration: req.body.duration,
      date: new Date(req.body.date)
    };
    
    user.exercises[user.exercises.length] = newExercise;
    user.save(function (err) {
      if(err) {
        console.error('ERROR!');
      }
    });
    
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify({
      name: user.user,
      id: user._id,
      exercise: {
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date.toGMTString()
      }  
    }, null, 4));
  });
  
});

app.get('/api/exercise/log', (req, res) => {
  if(req.query.userId) {
    User.findOne({"_id": req.query.userId}, function(err, user) {
      if(err) console.log(err);
      
      var from = new Date(req.query.from).getTime() || -Infinity;
      var to = new Date(req.query.to).getTime() || Infinity;
      var limit = req.query.limit || 0;

      var filterArr = user.exercises.filter((item) => {
        if(item.duration >= limit && from <= item.date.getTime() && item.date.getTime() <= to) {
          return true;
        }
        return false;
      });
      res.header("Content-Type",'application/json');
      res.send(JSON.stringify({
        name: user.user,
        id: user._id,
        count: filterArr.length,
        'match exercises': filterArr
      }, null, 4));
    });
  } else {
   res.send('userId required')
  }
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
