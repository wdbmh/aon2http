var socket = new io.Socket(host,{port:port});
socket.connect();
socket.on('connect', function(){
	
}) 
socket.on('message', function(data){
	if(data == "ready") {
		setTimeout(function(){
			$('#tv').append(v);
			$('#tv').removeClass('hide');
		},1000)
	}
}) 
socket.on('disconnect', function(){  })

var v = '<video width="608" height="342" controls="controls" autoplay="autoplay"><source src="/stream/prog_index.m3u8" /></video>';
$(function(){
	$('#channels a').click(function(e){
		e.preventDefault();
		$('#tv').addClass('hide');
		$('#tv video').get(0).pause();
		setTimeout(function(){$('#tv video').remove()},1000)
		msg = {channel:$(this).attr('href')}
		$('#channels a').removeClass('active');
		$(this).addClass('active')
		socket.send(msg)
		return false;
	})
})