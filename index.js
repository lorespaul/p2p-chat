//see https://github.com/nicojanssens/udp-hole-puncher-js
const dgram = require('dgram');
const UdpHolePuncher = require('udp-hole-puncher');
const stun = require('stun');
const readline = require('readline');

const STUN_SERVER = 'stun.l.google.com:19302';

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

async function main() {
    try {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const { address, port } = await getMappedAddress();
        console.log('Mapped Address:', address, port);

        const socket = dgram.createSocket('udp4');

        let connected = false
        socket.on('error', (error) => {
            console.log('socket error:', error)   
        });
        socket.on('message', (msg, rinfo) => {
            console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${msg}`);
            if (msg.toString().includes('puching')) {
                console.log('Hole punching packet received, connection established');
                connected = true;
            }
        });
        
        rl.question('Enter remote peer address: ', (remoteAddress) => {
            // ws.send(JSON.stringify({ type: 'connect', peerId: id, remotePeerId }));
            rl.question('Enter remote peer port: ', (remotePort) => {
                socket.on('listening', () => {
                    // puncher config
                    const puncher = new UdpHolePuncher(socket);
                    // when connection is established, send dummy message
                    puncher.on('connected', () => {
                      const message = Buffer.from('puching');
                      socket.send(message, 0, message.length, remotePort, remoteAddress);
                    });
                    // error handling code
                    puncher.on('error', (error) => {
                      console.log('puncher error:', error)
                    });
                    // connect to peer (using its public address and port)
                    puncher.connect(remoteAddress, remotePort);
                });
                socket.bind(port)
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

main();