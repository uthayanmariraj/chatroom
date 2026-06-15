import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import mysql from 'mysql2/promise'
import crypto from 'crypto'
import { createServer } from 'http'
import { Server } from 'socket.io'
import 'dotenv/config'

const JWT_SECRET = process.env.JWT_SECRET

function generateToken(username) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
        JSON.stringify(
            {
                username,
                exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
            }
        )
    ).toString('base64url')
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}, ${payload}`)
        .digest('base64url')

    return `${header}.${payload}.${signature}`
}

function verifyToken(token) {
    const [header, payload, signature] = token.split('.')
    const signCheck = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}, ${payload}`)
        .digest('base64url')
    if (signature !== signCheck) return null;
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null
    }
    return decodedPayload
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

app.use(cors())
app.use(express.json())

app.get('/',(req,res) => {
    res.send('<h2>thinkpadclit</h2>')
})

app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
        if (rows.length > 0) {
            return res.status(401).json({
                success: false,
                message: "Username already exists."
            })
        }

        const password_hash = await bcrypt.hash(password, 10)

        await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash])
        res.json({
            success: true,
        })
    } catch (err) {
        console.error("Signup error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])

        if (rows.length > 0) {
            const user = rows[0]
            const isMatch = await bcrypt.compare(password, user.password_hash)
            if (isMatch) {
                const token = generateToken(username)
                return res.json({
                    success: true,
                    token,
                    user: {
                        username
                    }
                })
            }
        }

        res.status(401).json({
            success: false,
            message: "Invalid username or password."
        })
    } catch (err) {
        console.error("Login error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/rooms', async (req, res) => {
    try {
        const { roomName, adminName, privacy = "PUB" } = req.body
        await pool.execute(
            'INSERT INTO rooms (room_name, admin_name, privacy) values (?, ?, ?)', [roomName, adminName, privacy]
        )
        io.emit("room-created")

        return (
            res.json({
                success: true,
                admin: adminName
            })
        )
    } catch (err) {
        console.error("creation error:", err)
        res.status(500).json({ success: false })
    }
})

app.get('/rooms', async (req, res) => {
    try {
        const userName = req.query.userName || "";
        const [rooms] = await pool.execute(
            'SELECT DISTINCT r.id, r.room_name, r.admin_name FROM rooms r LEFT JOIN room_members rm ON r.id = rm.room_id WHERE (r.privacy = "PUB" OR r.admin_name = ? OR rm.username = ?)',
            [userName, userName]
        )
        return res.json({
            success: true,
            rooms: rooms
        })
    } catch (err) {
        console.error("Error fetching rooms:", err)
        res.status(500).json({ success: false })
    }
})

app.delete('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { userName } = req.body

        const [rows] = await pool.execute('SELECT admin_name FROM rooms WHERE id = ?', [id])
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Room not found." })
        }
        const room = rows[0]
        if (room.admin_name !== userName) {
            return res.status(403).json({ success: false, message: "Only the admin can delete this room." })
        }
        await pool.execute('DELETE FROM rooms WHERE id = ?', [id])

        io.emit("room-deleted")

        res.json({ success: true })
    } catch (err) {
        console.error("Delete error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/rooms/:id/invites', async (req, res) => {
    try {
        const roomId = req.params.id;
        const { username, expiresIn, maxUses } = req.body;
        const [rows] = await pool.execute(
            `SELECT 1 FROM rooms r 
            LEFT JOIN room_members rm ON r.id = rm.room_id 
            WHERE r.id = ? AND (r.admin_name = ? OR rm.username = ?)`,
            [roomId, username, username]
        )
        if (!rows || rows.length === 0) {
            const [[priv]] = await pool.execute(
                `SELECT privacy FROM rooms WHERE id = ?`, [roomId]
            )
            if (priv.privacy === 'PRIV') {
                return res.status(403).json({ success: false, message: "not allowed to generate" });
            }
        }

        const token = crypto.randomBytes(16).toString('hex')
        let expiresAt = null
        if (expiresIn) {
            expiresAt = new Date(Date.now() + expiresIn * 1000);
        }
        await pool.execute(`INSERT INTO room_invites (room_id, token, created_by, max_uses, expires_at) VALUES (?,?,?,?,?)`,
            [roomId, token, username, maxUses, expiresAt])

        res.json({
            success: true,
            token: token
        });

    } catch (err) {
        console.error("Error generating invite:", err)
        res.status(500).json({ success: false })
    }
})

app.get('/invites/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const [rows] = await pool.execute(`SELECT ri.room_id, ri.max_uses, ri.uses, ri.expires_at, r.room_name
            FROM room_invites ri JOIN rooms r ON ri.room_id = r.id WHERE ri.token = ?`, [token])
        if (!rows || rows.length === 0) {
            return res.status(403).json({ success: false, message: "invalid token" });
        }
        const invite = rows[0]

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({
                success: false,
                valid: false,
                message: "This invite link has expired."
            });
        }

        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            return res.status(410).json({
                success: false,
                valid: false,
                message: "This invite link has reached its maximum usage limit."
            });
        }

        res.json({
            success: true,
            valid: true,
            roomName: invite.room_name,
            roomId: invite.room_id
        });

    } catch (err) {
        console.error("Error validating invite", err)
        res.status(500).json({ success: false, message: "Internal Server error" })
    }
})



app.post('/invites/:token/join', async (req, res) => {
    try {
        const { token } = req.params;
        const { username } = req.body;
        const [invites] = await pool.execute(
            `SELECT 
            ri.room_id, 
            ri.max_uses, 
            ri.uses, 
            ri.expires_at, 
            r.room_name, 
            r.admin_name,
            rm.username AS is_member -- Will be NULL if they are not a member
        FROM room_invites ri
        JOIN rooms r ON ri.room_id = r.id
        LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.username = ?
        WHERE ri.token = ?`
            ,
            [username, token]
        );
        if (invites.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid invite link." });
        }
        const invite = invites[0];
        const roomId = invite.room_id;
        const roomName = invite.room_name;

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: "This invite has expired." });
        }
        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            return res.status(410).json({ success: false, message: "This invite link has run out of uses." });
        }

        if (invite.admin_name === username || invite.is_member !== null) {
            return res.json({
                success: true,
                message: "You already have access to this room.",
                roomName: roomName
            })
        }
        await pool.execute(
            'INSERT INTO room_members (room_id, username) VALUES (?, ?)',
            [roomId, username]
        )
        await pool.execute(
            'UPDATE room_invites SET uses = uses + 1 WHERE token = ?',
            [token]
        )

        res.json({
            success: true,
            roomName: roomName
        });

    } catch (err) {
        console.error("Error joining room via invite:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
})

app.post('/verify-login', (req, res) => {
    const { token } = req.body
    if (!token) {
        return res.status(400).json({ success: false, message: 'token is required' })
    }
    const decoded = verifyToken(token)
    if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid or expired token." })
    }
    return res.status(200).json({
        success: true,
        username: decoded.username
    })
})

const activeRoomUsers = new Map() // roomName -> Set of usernames
const socketUserMap = new Map()    // socketId -> { room, username }

io.on("connection", (socket) => {
    console.log("user connected", socket.id)

    socket.on("join-room", ({ room, username }) => {
        socket.join(room)
        socketUserMap.set(socket.id, { room, username })

        if (!activeRoomUsers.has(room)) {
            activeRoomUsers.set(room, new Set())
        }
        if (username) {
            activeRoomUsers.get(room).add(username)
        }

        io.to(room).emit("room-users", Array.from(activeRoomUsers.get(room)))

        socket.to(room).emit("receive-message",{
            room,
            username: "reserved",
            message: `${username} has joined the chat`,
            isSystem: true
        })

        console.log(`${username} has joined ${room}`)
    })

    const handleUserLeaving = (socketId) => {
        const userInfo = socketUserMap.get(socketId)
        if (userInfo) {
            const { room, username } = userInfo
            if (activeRoomUsers.has(room)) {
                activeRoomUsers.get(room).delete(username)
                io.to(room).emit("room-users", Array.from(activeRoomUsers.get(room)))
                io.to(room).emit("receive-message", { 
                room, 
                username: "System", 
                message: `${username} has left the chat`, 
                isSystem: true 
            })
                if (activeRoomUsers.get(room).size === 0) {
                    activeRoomUsers.delete(room)
                }
            }
            socketUserMap.delete(socketId)
            console.log(`${username} has left ${room}`)
        }
    }

    socket.on("leave-room", ({ room, username }) => {
        socket.leave(room)
        handleUserLeaving(socket.id)
    })

    socket.on("send-message", ({ room, username, message }) => {
        socket.to(room).emit("receive-message", ({ room, username, message }))
    })

    socket.on("disconnect", (reason) => {
        handleUserLeaving(socket.id)
        console.log("user disconnected", socket.id, reason)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`server started at http://localhost:${PORT}`)
})
