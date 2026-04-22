import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Chat() {
  const { user } = useAuth();
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [text, setText]                   = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [instructors, setInstructors]     = useState([]);
  const [showNewChat, setShowNewChat]     = useState(false);
  const [serverError, setServerError]     = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load conversations
  const loadConvs = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadConvs();
        if (user.role === 'student') {
          const res = await api.get('/chat/instructors');
          setInstructors(res.data);
        }
        setServerError(false);
      } catch (e) {
        console.warn('Chat init error:', e?.response?.status, e?.message);
        if (!e?.response || e?.response?.status === 404) setServerError(true);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.role]);

  // Open conversation from URL param
  useEffect(() => {
    if (paramId && conversations.length) {
      const conv = conversations.find(c => c.id === paramId);
      if (conv) openConversation(conv);
    }
  }, [paramId, conversations]);

  // Load messages for active conversation
  const openConversation = async (conv) => {
    setActiveConv(conv);
    navigate(`/chat/${conv.id}`, { replace: true });
    try {
      const res = await api.get(`/chat/conversations/${conv.id}/messages`);
      setMessages(res.data.messages);
      // Mark as read in list
      setConversations(cs => cs.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ }
  };

  // Polling for new messages
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/chat/conversations/${activeConv.id}/messages`);
        setMessages(res.data.messages);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConv]);

  const sendMessage = async () => {
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    const optimistic = {
      id: 'tmp-' + Date.now(),
      conversationId: activeConv.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false
    };
    setMessages(m => [...m, optimistic]);
    setText('');
    try {
      const res = await api.post(`/chat/conversations/${activeConv.id}/messages`, { text: optimistic.text });
      setMessages(m => m.map(x => x.id === optimistic.id ? res.data : x));
      setConversations(cs => cs.map(c => c.id === activeConv.id
        ? { ...c, lastMessage: optimistic.text, lastMessageAt: new Date().toISOString() }
        : c
      ));
    } catch {
      setMessages(m => m.filter(x => x.id !== optimistic.id));
    }
    setSending(false);
  };

  const startNewChat = async (instructor) => {
    try {
      const res = await api.post('/chat/conversations', { instructorId: instructor.id });
      await loadConvs();
      openConversation(res.data);
      setShowNewChat(false);
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) + ' ' +
           d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

  if (serverError) return (
    <div className="chat-server-error">
      <div className="cse-icon">🔌</div>
      <h2>Сервер чата недоступен</h2>
      <p>Убедитесь что <strong>бэкенд запущен</strong>. Перезапустите его командой:</p>
      <div className="cse-cmd">cd backend &amp;&amp; node src/index.js</div>
      <p style={{fontSize:13, color:'var(--text-muted)', marginTop: 8}}>
        После перезапуска обновите страницу.
      </p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>🔄 Обновить страницу</button>
    </div>
  );

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>💬 Чат</h2>
          {user.role === 'student' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>
              ✏️ Новый чат
            </button>
          )}
        </div>

        {/* New chat modal — choose instructor */}
        {showNewChat && (
          <div className="new-chat-dropdown">
            <div className="ncd-header">
              <span>Выберите преподавателя</span>
              <button onClick={() => setShowNewChat(false)}>✕</button>
            </div>
            {instructors.map(inst => (
              <div key={inst.id} className="ncd-item" onClick={() => startNewChat(inst)}>
                <img src={inst.avatar} alt={inst.name} className="mini-avatar" />
                <div>
                  <div className="ncd-name">{inst.name}</div>
                  <div className="ncd-spec">{inst.specialization || `${inst.courseCount} курсов`}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversations list */}
        <div className="conv-list">
          {conversations.length === 0 && (
            <div className="conv-empty">
              <div>📭</div>
              <p>{user.role === 'student'
                ? 'Нажмите "Новый чат" чтобы написать преподавателю'
                : 'Студенты напишут вам после записи на курс'
              }</p>
            </div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
              onClick={() => openConversation(conv)}
            >
              <div className="conv-avatar-wrap">
                <img src={conv.otherUser?.avatar} alt={conv.otherUser?.name} className="conv-avatar" />
                <span className={`conv-role-dot role-${conv.otherUser?.role}`}></span>
              </div>
              <div className="conv-info">
                <div className="conv-name-row">
                  <span className="conv-name">{conv.otherUser?.name}</span>
                  <span className="conv-time">{conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}</span>
                </div>
                <div className="conv-last-row">
                  <span className="conv-last">{conv.lastMessage || (conv.courseName ? `📚 ${conv.courseName}` : 'Начните переписку')}</span>
                  {conv.unreadCount > 0 && <span className="conv-badge">{conv.unreadCount}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="chat-window">
        {!activeConv ? (
          <div className="chat-placeholder">
            <div className="chat-placeholder-icon">💬</div>
            <h3>Выберите диалог</h3>
            <p>
              {user.role === 'student'
                ? 'Выберите диалог слева или начните новый чат с преподавателем'
                : 'Выберите диалог со студентом для ответа'}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <img src={activeConv.otherUser?.avatar} alt={activeConv.otherUser?.name} className="chat-header-avatar" />
              <div>
                <div className="chat-header-name">{activeConv.otherUser?.name}</div>
                <div className="chat-header-role">
                  {activeConv.otherUser?.role === 'instructor' ? '👨‍🏫 Преподаватель' : '🎓 Студент'}
                  {activeConv.courseName && ` · 📚 ${activeConv.courseName}`}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="messages-empty">
                  <p>Начните переписку! Напишите первое сообщение.</p>
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`msg-wrap ${isMine ? 'mine' : 'theirs'}`}>
                    {!isMine && (
                      <img src={msg.senderAvatar || activeConv.otherUser?.avatar} alt={msg.senderName} className="msg-avatar" />
                    )}
                    <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="msg-text">{msg.text}</div>
                      <div className="msg-time">{formatTime(msg.createdAt)}{isMine && <span className="msg-read">{msg.read ? ' ✓✓' : ' ✓'}</span>}</div>
                    </div>
                    {isMine && (
                      <img src={user.avatar} alt={user.name} className="msg-avatar mine-avatar" />
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="Написать сообщение... (Enter для отправки)"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
              >
                {sending ? '⏳' : '📤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
