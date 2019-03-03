var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


var userIds = [];
var nicknames = {};
var nicknameColors = {};
var messages = [];
var userIndex = 0;

io.on('connection', function(socket){
	// on new user connection, generate nickname/color for user
  console.log('user ' + socket.id + ' connected.');
  newNickname = generateUniqueNickname();

  // on new user connection, send new user their username, all messages, and all online users
  socket.emit('user name', newNickname);
  for (var i = 0; i < messages.length; i++) {
  	socket.emit('chat message', messages[i]);
  }
  socket.emit('chat message', 'You have joined as ' + newNickname);
  for (var j = 0; j < userIds.length; j++) {
  	if (nicknames[userIds[j]] != null) {
  		socket.emit('user joined', nicknames[userIds[j]]);
  	}
  }

  // on new user connection, send existing users new user's username
  io.emit('user joined', newNickname);

  // add new user's nickname and color to global list of users
  userIds.push(socket.id);
  nicknames[socket.id] = newNickname;
  nicknameColors[socket.id] = generateUniqueColor();

  socket.on('disconnect', function(){
    console.log('user ' + socket.id + ' disconnected');
    io.emit('user left', nicknames[socket.id]);
    nicknames[socket.id] = null;
    nicknameColors[socket.id] = null;
  });

  // on chat message sent from a client, format message and emit to all clients
  socket.on('chat message', function(msg){
  	if (msg.startsWith('/nick ')) {
  		var requestedName = msg.substring(6, msg.length);
  		if (requestedName.length > 0 && !nicknameExists(requestedName)) {
  			socket.emit('user name', requestedName);
  			io.emit('user changed', nicknames[socket.id], requestedName);
  			io.emit('chat message', nicknames[socket.id] + ' changed their name to ' + requestedName);
  			nicknames[socket.id] = requestedName;
  		}
  	}
  	else if (msg.startsWith('/nickcolor ')) {
  		var requestedColor = msg.substring(11, msg.length);
  		if (requestedColor.length == 6 && !colorExists(requestedColor)) {
  			nicknameColors[socket.id] = '#' + requestedColor;
  		}
  	}
  	else {
			var formattedMessage = getFormattedMessage(socket.id, msg);
	  	boldMessage = getBoldMessage(formattedMessage);
	  	messages.push(formattedMessage);
	  	// send bold message to sender, and regular message to all other clients
	  	socket.emit('chat message', boldMessage);
	    socket.broadcast.emit('chat message', formattedMessage);
  	}
  });

});

http.listen(8080, function(){
  console.log('listening on *:8080');
});


function generateUniqueNickname() {
	userIndex += 1;
	return 'User ' + userIndex;
}

function generateUniqueColor() {
	red = getRandomNumberInRange(255).toString(16);
	red = red.length < 2 ? '0' + red : red;
	green = getRandomNumberInRange(255).toString(16);
	green = green.length < 2 ? '0' + green : green;
	blue = getRandomNumberInRange(255).toString(16);
	blue = blue.length < 2 ? '0' + blue : blue;
	return '#' + red + green + blue;
}

// taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomNumberInRange(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function getTimeStamp() {
	var date = new Date();
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var hoursString = hours < 10 ? '0' + hours : hours + '';
	var minutesString = minutes < 10 ? '0' + minutes : minutes + '';
	return hoursString + ':' + minutesString;
} 

function getNickNameText(userId) {
	nickname = nicknames[userId];
	nicknameColor = nicknameColors[userId];
	return '<font style="color:' + nicknameColor + ';">' + nickname + '</font>'
}

function getFormattedMessage(userId, msg) {
	return getTimeStamp() + ' ' + getNickNameText(userId) + ': ' + msg;
}

function getBoldMessage(msg) {
	return '<b>' + msg + '</b>';
}

function nicknameExists(nickname) {
	for (var k = 0; k < userIds.length; k++) {
		if (nickname === nicknames[userIds[k]]) {
			return true;
		}
	}
	return false;
}

function colorExists(color) {
	for (var l = 0; l < userIds.length; l++) {
		if (nicknameColors[userIds[l]] != null && color.toUpperCase() === nicknameColors[userIds[l]].toUpperCase()) {
			return true;
		}
	}
	return false;
}