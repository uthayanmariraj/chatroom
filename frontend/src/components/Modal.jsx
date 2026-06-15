import { useState } from 'react'


export default function Modal({ onClose, onCreate }) {
    const [roomName, setRoomName] = useState("")
    const [privacy, setPrivacy] = useState("PUB")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (roomName.trim()) {
            onCreate(roomName, privacy)
        }
    }
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Create New Room</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Enter room name..."
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                    />
                    <select value={privacy}
                        onChange={(e) => setPrivacy(e.target.value)}
                        required>
                        <option value="PUB">Public</option>
                        <option value="PRI">Private</option>
                    </select>
                    <div className="modal-buttons">
                        <button type="submit">Create</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}