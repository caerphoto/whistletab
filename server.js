var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var LISTEN_PORT = 3010;
var DEFAULT_TABS = [
  {
    name: 'Basic Scale',
    tab: 'def#gabc#',
    readOnly: true
  },
  {
    name: 'Extended Scale',
    tab: 'def# gab c#\nd+e+f#+ g+a+b+ c#+\nd++e++f#++ g++a++b++ c#++',
    readOnly: true
  }
];

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

app.get('/whistletab', function (req, res) {
  var serverStore = false;
  if (req.query.store === 'server') {
    serverStore = true;
  }
  res.render('index.ejs', { serverStore: serverStore });
});

app.get('/whistletab/tabs', function (req, res) {
  fs.readFile('tabs.json', 'utf8', function (err, jsonString) {
    var tabs;

    if (err) {
      return res.status(500).end();
    }
    try {
      tabs = JSON.parse(jsonString);
    } catch (parseError) {
      tabs = DEFAULT_TABS;
    }
    res.json(tabs);
  });
});

app.post('/whistletab/tabs', function (req, res) {
  var jsonString;

  try {
    jsonString = JSON.stringify(req.body);
  } catch (stringifyError) {
    return res.status(400).end();
  }

  fs.writeFile('tabs.json', jsonString, 'utf8', function (err) {
    if (err) {
      return res.status(500).end();
    }
    res.status(204).end();
  });
});

if (app.get('env') === 'production') {
  app.listen(LISTEN_PORT, 'localhost');
  console.log('Listening to localhost on ' + LISTEN_PORT);
} else {
  app.listen(LISTEN_PORT);
  console.log('Listening on ' + LISTEN_PORT);
}
