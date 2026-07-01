import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const buildDmRoomName = (userA, userB) => {
  const names = [userA.trim().toLowerCase(), userB.trim().toLowerCase()].sort();
  return `dm:${names.join('_')}`;
};

const normalizeRoomId = (roomId) => (roomId ? String(roomId) : '');

const formatRoomLabel = (room) => {
  if (!room) return '';
  if (!room.roomName.startsWith('dm:')) return room.roomName;
  const participants = room.roomName.replace('dm:', '').split('_');
  return participants.join(' & ');
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('chatUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('chatToken') || '');
  const [socket, setSocket] = useState(null);

  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({ baseURL: API_URL });
    if (token) {
      instance.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    return instance;
  }, [token]);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
      }
      setSocket(null);
      return;
    }

    const client = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUserJoined = (event) => {
      setStatusMessage(event.message);
    };

    const handleUserLeft = (event) => {
      setStatusMessage(event.message);
    };

    const handleTyping = ({ username: typingUsername }) => {
      setTypingUsers((prev) => {
        if (prev.includes(typingUsername)) return prev;
        return [...prev, typingUsername];
      });
    };

    const handleStopTyping = () => {
      setTypingUsers([]);
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [socket]);

  useEffect(() => {
    if (!token) return;

    const loadRooms = async () => {
      try {
        const response = await axiosInstance.get('/rooms');
        setRooms(response.data.rooms || []);
      } catch (error) {
        console.error('Failed to load rooms:', error);
      }
    };

    loadRooms();
  }, [axiosInstance, token]);

  const fetchRooms = async () => {
    try {
      const response = await axiosInstance.get('/rooms');
      setRooms(response.data.rooms || []);
      return response.data.rooms || [];
    } catch (error) {
      console.error('Failed to load rooms:', error);
      return [];
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const response = await axiosInstance.get(`/messages/${roomId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: loginEmail.trim(),
        password: loginPassword
      });

      const { token: authToken, user } = response.data;
      setToken(authToken);
      setCurrentUser(user);
      localStorage.setItem('chatToken', authToken);
      localStorage.setItem('chatUser', JSON.stringify(user));
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      setAuthError(error?.response?.data?.message || 'Login failed');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setAuthError('');

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword
      });

      const { token: authToken, user } = response.data;
      setToken(authToken);
      setCurrentUser(user);
      localStorage.setItem('chatToken', authToken);
      localStorage.setItem('chatUser', JSON.stringify(user));
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
    } catch (error) {
      setAuthError(error?.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogout = () => {
    if (socket) socket.disconnect();
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUser');
    setRooms([]);
    setSelectedRoom(null);
    setMessages([]);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!roomName.trim()) return;

    try {
      await axiosInstance.post('/rooms', {
        roomName: roomName.trim()
      });
      setRoomName('');
      fetchRooms();
    } catch (error) {
      if (error?.response?.status !== 409) {
        console.error('Failed to create room:', error);
      }
    }
  };

  const handleJoinRoom = async (room) => {
    if (!socket) return;

    const roomId = normalizeRoomId(room._id);
    const normalizedRoom = { ...room, _id: roomId };

    setSelectedRoom(normalizedRoom);
    setMessages([]);
    setStatusMessage(`Joined ${formatRoomLabel(normalizedRoom)}`);
    await fetchMessages(roomId);

    socket.emit('join-room', { roomId });
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!messageText.trim() || !selectedRoom || !socket) return;

    const roomId = normalizeRoomId(selectedRoom._id);

    socket.emit('send-message', {
      roomId,
      message: messageText.trim()
    });

    setMessageText('');
    socket.emit('stop-typing', { roomId });
  };

  const handleTyping = (value) => {
    setMessageText(value);
    if (!selectedRoom || !socket) return;

    const roomId = normalizeRoomId(selectedRoom._id);

    if (value.trim()) {
      socket.emit('typing', { roomId });
    } else {
      socket.emit('stop-typing', { roomId });
    }
  };

  const leaveRoom = () => {
    if (socket && selectedRoom) {
      socket.emit('leave-room', { roomId: normalizeRoomId(selectedRoom._id) });
    }

    setSelectedRoom(null);
    setMessages([]);
    setStatusMessage('');
    setTypingUsers([]);
  };

  const handleDirectMessage = async (event) => {
    event.preventDefault();
    if (!directUsername.trim()) return;
    if (directUsername.trim().toLowerCase() === currentUser.username.toLowerCase()) {
      alert('Please choose another person to message.');
      return;
    }

    const roomNameValue = buildDmRoomName(currentUser.username, directUsername.trim());

    try {
      await axiosInstance.post('/rooms', { roomName: roomNameValue });
    } catch (error) {
      if (error?.response?.status !== 409) {
        console.error('Failed to create direct message room:', error);
        return;
      }
    }

    const allRooms = await fetchRooms();
    const directRoom = allRooms.find((room) => room.roomName === roomNameValue);
    if (directRoom) {
      setDirectUsername('');
      handleJoinRoom(directRoom);
    }
  };

  const searchUsers = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);

    try {
      const response = await axiosInstance.get(`/users/search?username=${encodeURIComponent(searchTerm.trim())}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const openChatWith = async (peerUsername) => {
    if (!peerUsername.trim()) return;

    const roomNameValue = buildDmRoomName(currentUser.username, peerUsername.trim());

    try {
      await axiosInstance.post('/rooms', { roomName: roomNameValue });
    } catch (error) {
      if (error?.response?.status !== 409) {
        console.error('Failed to create direct message room:', error);
        return;
      }
    }

    const allRooms = await fetchRooms();
    const directRoom = allRooms.find((room) => room.roomName === roomNameValue);
    if (directRoom) {
      setDirectUsername('');
      handleJoinRoom(directRoom);
    }
  };

  const activeTypingUsers = typingUsers.filter((user) => user !== currentUser?.username);

  if (!currentUser) {
    return (
      <div className="chat-app auth-view">
        <div className="auth-panel">
          <div className="auth-header">
            <span className="auth-badge">Secure Chat</span>
            <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>Login or register to start instant one-to-one and group conversations.</p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
            >
              Register
            </button>
          </div>

          {authError && <div className="auth-error">{authError}</div>}

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit">Login</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <input
                type="text"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Username"
                required
              />
              <input
                type="email"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                placeholder="Email"
                required
              />
              <input
                type="password"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit">Register</button>
            </form>
          )}

          <div className="auth-footnote">
            <p>Fast, encrypted messaging with real-time updates across all devices.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Realtime Chat</h1>
          <p>Logged in as {currentUser.username}</p>
          <button className="secondary-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <section className="room-form">
          <h2>Create a room</h2>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Room name"
            />
            <button type="submit">Create room</button>
          </form>
        </section>

        <section className="room-form">
          <h2>Direct message</h2>
          <form onSubmit={handleDirectMessage}>
            <input
              type="text"
              value={directUsername}
              onChange={(event) => setDirectUsername(event.target.value)}
              placeholder="Person's username"
            />
            <button type="submit">Chat</button>
          </form>
          <form className="search-form" onSubmit={searchUsers}>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users"
            />
            <button type="submit">Search</button>
          </form>
          {isSearching && <p>Searching...</p>}
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  className="room-card"
                  onClick={() => openChatWith(user.username)}
                >
                  {user.username}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="room-list">
          <h2>Available rooms</h2>
          {rooms.length === 0 ? (
            <p>No rooms yet. Create one to get started.</p>
          ) : (
            rooms.map((room) => (
              <button
                key={room._id}
                type="button"
                className={selectedRoom?._id === room._id ? 'room-card active' : 'room-card'}
                onClick={() => handleJoinRoom(room)}
              >
                <span>{formatRoomLabel(room)}</span>
                <small>Created by {room.createdBy}</small>
              </button>
            ))
          )}
        </section>
      </aside>

      <main className="main-panel">
        {!selectedRoom ? (
          <div className="empty-state">
            <h2>Select a room to start chatting</h2>
            <p>Choose an existing room or create a new one on the left.</p>
          </div>
        ) : (
          <div className="chat-panel">
            <div className="chat-header">
              <div>
                <h2>{formatRoomLabel(selectedRoom)}</h2>
                <p>{statusMessage}</p>
              </div>
              <button type="button" className="secondary-button" onClick={leaveRoom}>
                Leave room
              </button>
            </div>

            <div className="message-list" id="message-list">
              {messages.map((message) => (
                <div
                  key={message._id || `${message.sender}-${message.createdAt}`}
                  className={message.sender === currentUser.username ? 'message-item mine' : 'message-item'}
                >
                  <div className="message-meta">
                    <strong>{message.sender}</strong>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="message-body">{message.message}</div>
                </div>
              ))}
            </div>

            <div className="typing-indicator">
              {activeTypingUsers.length > 0 && (
                <p>{activeTypingUsers.join(', ')} {activeTypingUsers.length === 1 ? 'is' : 'are'} typing...</p>
              )}
            </div>

            <form className="send-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(event) => handleTyping(event.target.value)}
                placeholder="Type a message..."
                disabled={!selectedRoom}
              />
              <button type="submit" disabled={!messageText.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
