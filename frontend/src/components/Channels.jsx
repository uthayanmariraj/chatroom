import { useState, useEffect, useContext, useRef} from 'react'
import { UserContext, SocketContext } from '../UserContext'
import { useNavigate } from 'react-router-dom'
import InviteModal from './invites/InviteModal.jsx' 

export default function Channels({ roomName, roomId, adminName }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [members, setMembers] = useState([])
    const username = useContext(UserContext)
    const socket = useContext(SocketContext)
    const navigate = useNavigate()
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
    },[messages])

    useEffect(() => {
        const joinRoom = () => {
            socket.emit("join-room", { room: roomName, username })
        }

        joinRoom()
        socket.on("connect", joinRoom)
        
        const handleReceive = (data) => {
            setMessages((prev) => [...prev, data])
        }

        const handleRoomUsers = (userList) => {
            setMembers(userList)
        }

        socket.on("receive-message", handleReceive)
        socket.on("room-users", handleRoomUsers)

        return () => {
            socket.emit("leave-room", { room: roomName, username })
            socket.off("connect", joinRoom)
            socket.off("receive-message", handleReceive)
            socket.off("room-users", handleRoomUsers)
        }
    }, [roomName, socket, username])

    function handleSend(e) {
        e.preventDefault()
        if (!message.trim()) return
        socket.emit("send-message", { room: roomName, username, message: message.trim() })
        setMessages((prev) => [...prev, { username, message: message.trim() }])
        setMessage('')
    }

    async function handleDelete() {
        if (!confirm(`Are you sure you want to delete #${roomName}?`)) return
        try {
            const response = await fetch(
                `${BACKEND_URL}/rooms/${roomId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userName: username
                    })
                }
            )
            const data = await response.json()
            if (data.success) {
                navigate('/general')
            } else {
                alert(data.message || "Failed to delete room.")
            }
        } catch (err) {
            console.error("Error deleting room:", err)
        }
    }

    return (
        <div className="channel-container">
            {/* Left Side: Chat Area */}
            <div className="chat-area">
                <div className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1>#{roomName}</h1>
                        <button onClick={() => setShowInviteModal(true)} className="invite-btn">
                            Invite
                        </button>
                        {username === adminName && (
                            <button onClick={handleDelete} className="delete-btn">✖</button>
                        )}
                    </div>
                </div>

                <div className="message-container">
                    <ul className="message-list">
                        {messages.map((message, index) => {
                            if(message.isSystem){
                                return(
                                    <li key={index} className = "message-system-notif">
                                        <p className = "system-text">{message.message}</p>
                                    </li> 
                                )
                            }
                            else{
                                return(
                                    <li key={index} className="message">
                                        <p className="username">{message.username}: &nbsp;</p>
                                        <p>{message.message}</p>
                                    </li>
                                )
                            }
                        })}
                        <div ref={messagesEndRef} />
                    </ul>
                </div>

                <form className='message-form' onSubmit={handleSend}>
                    <input
                        className="message-box"
                        placeholder='Enter Message'
                        value={message}
                        onChange={(e) => { setMessage(e.target.value) }} />
                    <button className='send-btn'>SEND</button>
                </form>
            </div>

            {/* Right Side: Members Sidebar */}
            <div className="members-sidebar">
                <h3>Members</h3>
                <ul className="members-list">
                    {members.map((member) => (

                        <li key={member} className="member-item">
                            <span className="status-dot"></span>
                            {member}
                        </li>
                    ))}
                </ul>
            </div>

            {showInviteModal && (
                <InviteModal 
                    roomId={roomId} 
                    roomName={roomName} 
                    onClose={() => setShowInviteModal(false)} 
                />
            )}
        </div>
    )
}

