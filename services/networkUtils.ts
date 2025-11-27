import Peer, { DataConnection } from 'peerjs';
import { GameState } from '../types';

// Helper to sanitize state for sending over network (remove functions)
// JSON.stringify actually does this automatically (strips functions), 
// but we might want to be explicit or handle circular refs if any (currently none).
export const serializeState = (state: GameState): any => {
    return JSON.parse(JSON.stringify(state));
};

export class NetworkManager {
    peer: Peer | null = null;
    conn: DataConnection | null = null;
    role: 'HOST' | 'GUEST' | 'NONE' = 'NONE';
    
    // Callbacks
    onData: (data: any) => void = () => {};
    onConnect: (peerId: string) => void = () => {};
    onDisconnect: () => void = () => {};

    constructor() {}

    init(id?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.peer) this.peer.destroy();
            
            // If ID is provided, we try to use it (optional, usually let PeerJS gen it)
            this.peer = new Peer(id || undefined as any);

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                if (this.role === 'HOST') {
                    this.handleConnection(conn);
                } else {
                    // Reject unexpected connections if not host
                    conn.close();
                }
            });

            this.peer.on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    // Host waits for connection
    hostGame(onData: (data: any) => void): Promise<string> {
        this.role = 'HOST';
        this.onData = onData;
        return this.init();
    }

    // Guest connects to host
    joinGame(hostId: string, onData: (data: any) => void): Promise<void> {
        this.role = 'GUEST';
        this.onData = onData;
        return new Promise((resolve, reject) => {
             this.init().then(() => {
                 if (!this.peer) return;
                 const conn = this.peer.connect(hostId);
                 this.handleConnection(conn);
                 
                 // Wait for open
                 conn.on('open', () => {
                     resolve();
                 });
                 
                 // Timeout fallback
                 setTimeout(() => {
                     if (!conn.open) reject(new Error("Connection timeout"));
                 }, 5000);
             });
        });
    }

    handleConnection(conn: DataConnection) {
        if (this.conn) {
            this.conn.close();
        }
        this.conn = conn;

        this.conn.on('open', () => {
            console.log("Connection opened");
            this.onConnect(conn.peer);
            
            // Send Hello
            this.send({ type: 'HELLO', payload: { role: this.role } });
        });

        this.conn.on('data', (data) => {
            this.onData(data);
        });

        this.conn.on('close', () => {
            console.log("Connection closed");
            this.onDisconnect();
            this.conn = null;
        });

        this.conn.on('error', (err) => {
            console.error("Connection error:", err);
        });
    }

    send(data: any) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    close() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.peer = null;
        this.conn = null;
        this.role = 'NONE';
    }
}

export const networkManager = new NetworkManager();