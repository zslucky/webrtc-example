var http = require('http');
var static = require('node-static');

var file = new(static.Server)();
var app = http.createServer(function(req, res) {
  file.serve(req, res);
}).listen(2016);

var io = require('socket.io').listen(app);

// Max clients in the room
var maxClientsPerRoom = 5;
// Remember which socket in which room.
var roomClientsMap = {};

io.sockets.on('connection', function(socket) {

  // Listen on user create room or join the room
  socket.on('create or join', function(room) {

    var roomClients;

    roomClientsMap[room] = roomClientsMap[room] || 0;
    roomClients = roomClientsMap[room];

    if (roomClients >= 0 && roomClients <= maxClientsPerRoom) {

      if (roomClients === 0) {
        socket.emit('created', room);
      } else {
        socket.emit('joined', room);
      }

      socket.join(room);
      roomClientsMap[room]++;

      // Emit message to correct clients
      socket.on('message', function(message) {
        io.in(room).emit('message', message);
      });

      // Listen on user disconnect event
      socket.on('disconnect', function() {
        console.log(socket.id, ' leave the room: ' + room);
        socket.leave(room);
        roomClientsMap[room]--;
      });

    } else {
      socket.emit('full', room);
    }

  });

});
