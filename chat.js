const os = require('os');
const fs = require('fs');
const http = require('http').createServer(function (req, res) {
    fs.readFile('index.html', function(err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
});
const io = require('socket.io')(http, {
    cors: {
        origin: "https://shefoo-chat.herokuapp.com",
        methods: ["GET"],
        credentials: true
    }
});

function roomIsExist(allRooms, room){
    return typeof allRooms.get(room) === 'undefined' ? false : true
}


io.sockets.on('connection', function(socket) {

    socket.on('join_or_create', function (data){
        try{
            const allRooms = io.sockets.adapter.rooms
            if (!roomIsExist(allRooms, data.roomName)){
                socket.join(data.roomName)
                socket.emit('created', {members : 1})
            }else if (allRooms.get(data.roomName).size > 0){
                socket.join(data.roomName)
                socket.emit('joined', {members : allRooms.get(data.roomName).size})
                socket.to(data.roomName).emit('new_member_joined', {userName: data.userName})
            }else{
                socket.emit('fulled', {message : "room is full"})
            }
        }catch(e){
            socket.emit('error','couldnt perform requested action');
        }
    })

    socket.on('leave',function(data){
        try{
            socket.leave(data.roomName);
            socket.to(data.roomName).emit('left', {userName: data.userName});
        }catch(e){
            socket.emit('error','couldnt perform requested action');
        }
    })


    socket.on('new_message', function(data) {
        socket.to(data.roomName).emit('new_message', {userName: data.userName, message: data.message});
    })


    socket.on('message', function(message) {
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);
    })


    socket.on('ipaddr', function() {
        const ifaces = os.networkInterfaces();
        for (const dev in ifaces) {
            ifaces[dev].forEach(function(details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });


    socket.on('bye', function(){
        console.log('received bye');
    });
});


http.listen(process.env.PORT || 3000);
