//see https://github.com/nicojanssens/udp-hole-puncher-js
const dgram = require('dgram');
const UdpHolePuncher = require('udp-hole-puncher');
const stun = require('stun');
const readline = require('readline');

const STUN_SERVER = 'stun.l.google.com:19302';
const CONNECTION_MESSAGE = 'puching';

async function getMappedAddress() {
    return new Promise((resolve, reject) => {
        stun.request(STUN_SERVER, (err, res) => {
            if (err) {
                reject(err);
            } else {
                const { address, port } = res.getXorAddress();
                resolve({ address, port });
            }
        });
    });
}

function sendMessage(socket, message, address, port){
    const buffer = Buffer.from(message);
    socket.send(buffer, 0, buffer.length, port, address);
}

async function main() {
    try {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        let peerAddress, peerPort
        const { address, port } = await getMappedAddress();
        console.log('Mapped Address:', address, port);

        const socket = dgram.createSocket('udp4');

        socket.on('error', (error) => {
            console.log('socket error:', error)   
        });
        socket.on('message', (msg, rinfo) => {
            console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${msg}`);
            if (msg.toString().includes(CONNECTION_MESSAGE)) {
                console.log('Hole punching packet received, connection established');
                rl.on('line', (input) => {
                    sendMessage(socket, input, peerAddress, peerPort);
                })
            }
        });
        
        rl.question('Enter remote peer address: ', (remoteAddress) => {
            // ws.send(JSON.stringify({ type: 'connect', peerId: id, remotePeerId }));
            rl.question('Enter remote peer port: ', (remotePort) => {
                peerAddress = remoteAddress;
                peerPort = remotePort;

                socket.on('listening', () => {
                    // puncher config
                    const puncher = new UdpHolePuncher(socket, {
                        maxRequestAttempts: 100
                    });
                    // when connection is established, send dummy message
                    puncher.on('connected', () => {
                        sendMessage(socket, CONNECTION_MESSAGE, peerAddress, peerPort);
                    });
                    // error handling code
                    puncher.on('error', (error) => {
                      console.log('puncher error:', error);
                    });
                    // connect to peer (using its public address and port)
                    puncher.connect(peerAddress, peerPort);
                });
                socket.bind(port)
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

main();