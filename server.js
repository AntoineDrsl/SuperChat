var app = require('express')()
var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
var ent = require('ent') //bloque les caractères HTML
var mongoose = require('mongoose')

var users = {};
var connectedUsers = [];

mongoose.connect('mongodb://localhost/SuperChat', { useNewUrlParser: true, useUnifiedTopology: true }, function(err){
if(err) {
    console.log(err)
} else {
    console.log('Connected to mongodb')
}
})

app.get('/', function(req, res) {
    res.render('index.ejs', {
        'users': connectedUsers
    })
})

io.sockets.on('connection', function(socket) {

    socket.on('newClient', function(pseudo) {
        pseudo = ent.encode(pseudo)
        socket.pseudo = pseudo
        connectedUsers.push(socket.pseudo)
        users[socket.pseudo] = socket
        socket.broadcast.emit('newClient', pseudo)
    })

    socket.on('message', function(message, callback) {
        message = ent.encode(message).trim()
        if(message.substr(0,3) === "/w ") {    
            message = message.substr(3)
            var space = message.indexOf(' ')
            if(space != -1) {
                var name = message.substr(0, space)
                message = message.substr(space + 1)
                if(name in users) {
                    users[name].emit('whisper', { pseudo: socket.pseudo, message: message })
                } else {
                    callback('La personne entrée n\'est pas connectée.')
                }
            } else {
                callback('Veuillez entrer un message.')
            }
        } else {
            socket.broadcast.emit('message', { pseudo: socket.pseudo, message: message })
        }
    })
    
    socket.on('disconnect', function() {
        socket.broadcast.emit('clientLeft', socket.pseudo)
        var index = connectedUsers.indexOf(socket.pseudo)
        if(index > -1) {
            connectedUsers.splice(index, 1)
        }
        delete users[socket.pseudo]
    })

})


app.use(function(req, res, next) {
    res.setHeader('Content-type', 'text/html')
    res.status(404).send('Page introuvable !')
})

server.listen(8080)