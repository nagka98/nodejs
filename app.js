const port = require('serialport');

const serial = new port.SerialPort({
    path: 'COM9',
    baudRate:115200,
}).setEncoding('utf8')
let timestamp = new Date().getTime();
let data_Recv = []; 
const readline = new port.ReadlineParser();
serial.pipe(readline);
readline.on('data',function(line){
    const temp = new Date().getTime();
    JSON.stringify(line).split(',').forEach(i=>{
        data_Recv.push((i.replace(/[^0-9.+-]/g, '')))
    });
    if(temp - timestamp > 500)
    {
        console.log(data_Recv.toString());
        data_Recv = [];
        timestamp = temp;
    }
});