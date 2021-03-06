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

var SECRET = process.env.SECRET;

if (!SECRET) {
  throw new Error('No SECRET environment variable set.');
}

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

function log(eventString, request) {
  console.log([
    new Date(),
    '[' + eventString + ']',
    request.method,
    request.path,
    request.ip,
    request.url
  ].join(' '));
}

function getTabs(req, callback) {
  fs.readFile('tabs.json', 'utf8', function (err, jsonString) {
    var tabs;
    var logInfo = 'read and parse';

    if (err) {
      log('file open error', req);
      return res.status(500).end();
    }
    try {
      tabs = JSON.parse(jsonString);
    } catch (parseError) {
      tabs = DEFAULT_TABS;
      logInfo = 'parse failed';
    }

    callback(tabs);
    log(logInfo, req);
  });
}

app.get('/whistletab', function (req, res) {
  var serverStore = false;
  if (req.query.secret && req.query.secret === SECRET) {
    serverStore = true;
  }
  getTabs(req, function (tabs) {
    res.render('index.ejs', {
      serverStore: serverStore,
      tabs: tabs,
      secret: SECRET
    });
  });

  log('index', req);
});

app.get('/whistletab/tabs', function (req, res) {
  getTabs(req, function (tabs) {
    res.json(tabs);
  });
});

app.post('/whistletab/tabs', function (req, res) {
  var jsonString;

  if (req.header('Secret') !== SECRET) {
    return res.status(403).end();
  }

  try {
    jsonString = JSON.stringify(req.body);
  } catch (stringifyError) {
    log('unable to parse sent data', req);
    return res.status(400).end();
  }

  fs.writeFile('tabs.json', jsonString, 'utf8', function (err) {
    if (err) {
      log('file open error', req);
      return res.status(500).end();
    }
    log('saved new tabs', req);
    res.status(204).end();
  });
});

if (app.get('env') === 'production') {
  app.listen(LISTEN_PORT, 'localhost');
  console.log('Listening to localhost on ' + LISTEN_PORT + '. PID: ' + process.pid);
  fs.writeFileSync('pidfile', process.pid, 'utf8');
} else {
  app.listen(LISTEN_PORT);
  console.log('Listening on ' + LISTEN_PORT + '. PID: ' + process.pid);
  fs.writeFileSync('pidfile', process.pid, 'utf8');
}
