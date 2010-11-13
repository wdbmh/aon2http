var express = require("express"),
	haml = require("hamljs"),
	fs = require("fs"),
	io = require("socket.io"),
	sys = require("sys"),
	spawn = require('child_process').spawn,
	path = require("path"),  
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

	vlc = spawn('/Applications/VLC.app/Contents/MacOS/VLC',[channels[index].address,'-I','rc','--sout=#transcode{fps=25,vcodec=h264,venc=x264{aud,profile=baseline,level=30, keyint=30,bframes=0,ref=1,nocabac},acodec=mp3,ab=56,audio-sync,deinterlace}:standard{mux=ts,dst=-,access=file}']),
	stream = spawn('mediastreamsegmenter',["-O","-b","http://10.0.0.31:8000/stream/","-f","public/stream/","-s","3","-D","-t","5"]);

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

	// iv = setInterval(function(){
	// 	fs.stat('public/stream/prog_index.m3u8',function(err,stat){
	// 		if(!err) {
	// 			clearInterval(iv);
	// 			if(sc) {
	// 				sc.send('ready');
	// 			}
	// 		}
	// 	})
	// 	
	// },100)
}
	
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

var channels;
fs.readFile('channels.json', function(err, data){
	if(err) throw err;
	channels = JSON.parse(data);
	startStream();
});

app.get('/', function(req, res){
    res.render('index',{
		locals: {
			channels: channels
		}
	});
});

app.listen(8000);
var sc;
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