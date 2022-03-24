var net = require("net");
var web = require("http");

var buffer_global = 0;

const web_server = web.createServer(function(req,res){
    while(buffer_global < 900){
        res.write(buffer_global + "\n");
    }
    res.end();
});

web_server.listen(3000, function(err){
    if(err)
    {
        console.log("something wrong " + err.message);
    }else{
        console.log("http listening on port 3000");
    }
 
});
var server = net.createServer();

server.on("connection",function(socket){
    console.log("new client connection at " + socket.remoteAddress + "\nport : " + socket.remotePort);

    socket.on("data", function(buffer){
        buffer_global = buffer;
        console.log("alert!!! incoming data :" + buffer);
    })

    socket.on("close", function(){
        console.log("server closed");
    });

    socket.on("error",function(err){
        console.log("error message" + err.message);
    })
});

server.listen(5000, function(){
    console.log("listening to 5000 port at ip : %j",server.address());
});


