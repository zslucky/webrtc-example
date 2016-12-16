var http = require('http');
var https = require('https');
var fs = require('fs');
var nodeStatic = require('node-static');
var _ = require('lodash');

var httpsOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
var file = new(nodeStatic.Server)();
// Https needed.
var app = https.createServer(httpsOptions, function(req, res) {
  file.serve(req, res);
}).listen(2016);
var io = require('socket.io').listen(app);

// Max clients in the room
var maxClientsPerRoom = 5;
// Remember which socket in which room.
var roomClientsMap = {};

io.sockets.on('connection', function(socket) {
  // Listen on user create room or join the room
  socket.on('create or join', function(message) {
    var roomClients;

    roomClientsMap[message.room] = roomClientsMap[message.room] || [];
    roomClients = roomClientsMap[message.room].length;

    if (roomClients >= 0 && roomClients <= maxClientsPerRoom) {
      if (roomClients === 0) {
        var createdMessage = {
          myId: socket.id
        };

        socket.emit('created', createdMessage);
        console.log(message.name, ' create room: ', message.room);
      } else {
        var joinMessage = {
          myId: socket.id,
          roomClients: roomClientsMap[message.room]
        };

        socket.emit('joined', joinMessage);
        console.log(message.name, ' joined room: ', message.room);
      }

      socket.join(message.room);
      roomClientsMap[message.room].push(socket.id);

      socket.on('sendOffer', function(offerMessage) {
        console.log(offerMessage.myId, ' send offer to: ', offerMessage.remoteId);
        socket.broadcast.to(offerMessage.remoteId).emit('receiveOffer', offerMessage);
      });

      socket.on('sendAnswer', function(answerMessage) {
        console.log(answerMessage.myId, ' send answer to: ', answerMessage.remoteId);
        socket.broadcast.to(answerMessage.remoteId).emit('receiveAnswer', answerMessage);
      });

      socket.on('message', function(normalMessage) {
        if (normalMessage.type === 'candidate') {
          console.log(normalMessage.myId, ' send candidate to: ', normalMessage.remoteId);
          socket.broadcast.to(normalMessage.remoteId).emit('iceCandidate', normalMessage);
        } else {
          io.in(message.room).emit('message', normalMessage);
        }
      });

      // Listen on user disconnect event
      socket.on('disconnect', function() {
        console.log(socket.id, ' leave the room: ' + message.room);
        socket.leave(message.room);
        _.pull(roomClientsMap[message.room], socket.id);
        console.log('------------The online clients--------------');
        console.log(roomClientsMap[message.room]);
      });
    } else {
      socket.emit('full', room);
    }
  });
});
