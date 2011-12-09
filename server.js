var http = require('http'), 
url = require('url'), 
path = require('path'), 
fs = require('fs'),
request = require('request'),
events = require('events');

function load_static_file(uri, res) {
    var filename = path.join(process.cwd(), uri);
    path.exists(filename, function(exists) {
        if(!exists) {
            res.writeHead(404, {'Content-Type':'text/plain'});
            res.end('404 Not Found\n');
            return;
        } else {
            fs.readFile(filename, 'binary', function(err, file) {
                if(err) {
                    res.writeHead(500, {'Content-Type':'text/plain'});
                    res.end(err + '\n');
                    return;
                } else {
                    res.writeHead(200);
                    res.write(file, 'binary');
                    res.end();
                }
            });            
        }
    });
}

var twitter_client = http.createClient(80, "api.twitter.com");
var tweet_emitter = new events.EventEmitter();

var zone_info = {tweet_count: 0, zone_count: 0, time_zones: {}}

function get_tweets() {
    request({ uri:'http://api.twitter.com/1/statuses/public_timeline.json'}, function(err, response, body) {
        try {
            var tweets = JSON.parse(body);
            if(tweets.length > 0) {

                var time_zones = zone_info['time_zones'];

                // retrieve the timezones
                for(var i in tweets) {
                    var time_zone = tweets[i]['user']['time_zone'];
                    if (!time_zone) continue;

                    if(!time_zones[time_zone]) {
                        time_zones[time_zone] = 1;
                        zone_info['zone_count']++;
                    } else {
                        time_zones[time_zone]++;
                    }
                    zone_info['tweet_count']++;
                }

                tweet_emitter.emit("tweets", zone_info);


                // for(var key in time_zones) {
                //     console.log((100.0 * time_zones[key] / tweet_count) + "%: " + key);
                // }
                // console.log('===== Time Zone Count: ' + time_zone_count + ', Tweet Count: ' + tweet_count + ' ============\\n');
            }
        }
        catch(error) {
            console.log('Error: ' + error);
        }
    });
}

setInterval(get_tweets, 5000);

http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;
    if(uri === "/stream") {
        var listener = tweet_emitter.once("tweets", function(tweets) {
            res.writeHead(200, {'Content-Type':'text/plain'});
            res.end(JSON.stringify(tweets));
        });
        console.log('Listener count:' + tweet_emitter.listeners.length);
    } else {
        load_static_file(uri, res);
    }
}).listen(8000);

console.log('Tweet Server running at http://localhost:8000');

