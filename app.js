var express = require("express"),
	haml = require("hamljs"),
	fs = require("fs"),
	io = require("socket.io"),
	sys = require("sys"),
	spawn = require('child_process').spawn,
	path = require("path");  
	util = require("util");


var channels;
var index = 0;
var vlc;
var stream;
var iv;

startStream = function(){
	fs.readdir('public/stream/', function(err,files){
		for(i=0;i<files.length;i++) {
			fs.unlink('public/stream/'+files[i]);
		}
	})

	vlc = spawn(config.vlc,[channels[index].address,'-I','rc','--sout=#transcode{fps=25,vcodec=h264,venc=x264{aud,profile=baseline,level=30, keyint=30,bframes=0,ref=1,nocabac},acodec=mp3,ab=56,audio-sync,deinterlace}:standard{mux=ts,dst=-,access=file}']),
	stream = spawn(config.segmenter,["-O","-b","http://"+config.host+":"+config.port+"/stream/","-f","public/stream/","-s","3","-D","-t","5"]);

 	vlc.stdout.on('data', function (data) {
 	  stream.stdin.write(data);
 	});

 	vlc.stderr.on('data', function (data) {
 	  //util.print('vlc stderr: ' + data);
 	});

 	vlc.on('exit', function (code) {
 	  console.log('vlc process exited with code ' + code);
 	  stream.stdin.end();
 	});

 	stream.stdout.on('data', function (data) {
 	  //util.print(data);
		if(data.toString().indexOf('wrote initial index file') > -1) {
			if(sc)
				sc.send('ready');
		}
 	});

 	stream.stderr.on('data', function (data) {
 	  //util.print('stream stderr: ' + data);
 	});

 	stream.on('exit', function (code) {
 	    console.log('stream process exited with code ' + code);
		startStream();
 	});
}

var channels;
var config;
var sc;
fs.readFile('config.json', function(err, data){
	if(err) throw err;
	config = JSON.parse(data);

	fs.readFile('channels.json', function(err, data){
		if(err) throw err;
		channels = JSON.parse(data);
		startStream();
	});

	var app = express.createServer();

	app.configure(function(){
	    app.use(express.methodOverride());
	    app.use(express.bodyDecoder());
	    app.use(app.router);
	    app.use(express.staticProvider(__dirname + '/public'));
		app.set('view engine', 'hamljs');
	});

	app.configure('development', function(){
	    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	});

	app.configure('production', function(){
	    app.use(express.errorHandler());
	});

	app.get('/', function(req, res){
	    res.render('index',{
			locals: {
				channels: channels,
				host: '<script type="text/javascript"> host = "'+config.host+'"; port = "'+config.port+'"</script>'
			}
		});
	});

	app.listen(config.port);
	var socket = io.listen(app); 
	socket.on('connection', function(client){ 
		sc = client;
		client.on('message', function(data){
			if(data.channel) {
				index = data.channel;
				if(vlc)
					vlc.kill();
			}
		}) 
		client.on('disconnect', function(){}) 
	});

});
	
