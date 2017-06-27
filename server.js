// system library
const url = require('url');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

// database related
const mongo = require('mongodb').MongoClient
const dburl = 'mongodb://localhost:27017/learn';
var coll;

// system dependent
var bl = require('bl');
var express = require('express');
var app = express();

const apiurl= 'https://www.googleapis.com/customsearch/v1';

// database content
let db;
mongo.connect(dburl, function(err, conn) {
    if (err) console.log(err);
    
    console.log('connect success');
    db = conn;
    coll = db.collection('search_history');
});

// use middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'jade');

var paramter = {
    key: "AIzaSyAPrp4G7qgTgE4e0nA7u8D3jIAVSTaw1NQ",
    cx: "013308455126627829225:musfcr91sx4",
    searchType:"image",
    fields:"items(title,link,image)",
    num: 10,
    q: ""
}

function getRelatedImageData (query){
  var queryUrl;
  paramter.q = query;
  queryUrl = apiurl + '?' + querystring.stringify(paramter);
  
  console.log('queryUrl', queryUrl);
  
  return new Promise((resolve, reject) => {
      https.get(queryUrl, (res) => {
          res.pipe(bl((err, data)=>{
            console.log('data', data.toString);
            if (err) return console.error(err);
             
            resolve(data.toString());
          }));
      }).on('error', (e) => {
        reject(e);
      });
  })
}

function historySave (query) {
  let date = new Date();
  return new Promise((resolve, reject)=>{
    coll.insert({
      term: query,
      when: date
    }).then((result)=>{
      console.log('insert result', result);
      resolve(result);
    }).catch((err)=>{
      console.log(err);
    })
  })
}

function findLatest (query) {
  let date = new Date();
  return new Promise((resolve, reject)=>{
    coll.find({}).sort({when:-1}).limit(10).toArray().then((result)=>{
      console.log('insert result', result);
      resolve(result);
    }).catch((err)=>{
      console.log(err);
    })
  })
}

app.get('/', (req, res)=>{
    res.send('404');
});

app.get('/api/imagesearch/:q', async (req, res)=>{
    var q = req.params.q;
    var offset = req.query.offset;
    
    if (!q) res.redirect('/');
    
    await historySave(q);
    
    var imageData = await getRelatedImageData(q);
    
    console.log('imageData', imageData);
    res.send(imageData);
});

app.get('/api/latest/imagesearch', async (req, res)=>{
    var result = await findLatest();
    console.log('findLatest', result);
    res.send(result);
});

app.listen(process.env.PORT || 5000);