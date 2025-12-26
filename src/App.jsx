import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const generateSessionId = () => Math.random().toString(36).substring(2, 15);

function App() {
  const [sessionId] = useState(generateSessionId());
  const [activeTab, setActiveTab] = useState("chat");
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  
  // Chat State
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Quiz State
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  
  // Flashcards State
  const [flashcards, setFlashcards] = useState(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});
  const [currentCardSet, setCurrentCardSet] = useState(0);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Calculate quiz score
  useEffect(() => {
    if (quizData && Object.keys(selectedAnswers).length > 0) {
      const correct = quizData.filter((q, idx) => selectedAnswers[idx] === q.correct_answer).length;
      setQuizScore({
        correct,
        total: quizData.length,
        percentage: Math.round((correct / quizData.length) * 100)
      });
    }
  }, [selectedAnswers, quizData]);

  // Handlers
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("Please select a PDF file first");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    setUploadStatus("Uploading and processing PDF...");
    
    try {
      await axios.post(`http://localhost:8001/upload?session_id=${sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadStatus(`Uploading... ${percent}%`);
        }
      });
      setUploadStatus("Ready to learn! 🎉");
    } catch (err) {
      setUploadStatus("Upload failed. Please try again.");
      console.error(err);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const userMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion("");
    setIsChatLoading(true);

    try {
      const res = await axios.post("http://localhost:8001/chat", {
        question: question,
        session_id: sessionId
      });
      
      const botMessage = {
        role: "bot",
        content: res.data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatHistory(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        role: "bot",
        content: "I apologize, but I encountered an error. Please make sure you've uploaded a PDF and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    try {
      const res = await axios.post("http://localhost:8001/generate_quiz", { 
        session_id: sessionId,
        num_questions: 5
      });
      setQuizData(res.data.quiz);
      setSelectedAnswers({});
      setQuizScore(null);
    } catch (err) {
      alert("Please upload a PDF first before generating a quiz.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setCardsLoading(true);
    try {
      const res = await axios.post("http://localhost:8001/generate_flashcards", { 
        session_id: sessionId,
        num_cards: 6
      });
      setFlashcards(res.data.flashcards);
      setFlippedCards({});
      setCurrentCardSet(prev => prev + 1);
    } catch (err) {
      alert("Please upload a PDF first before generating flashcards.");
    } finally {
      setCardsLoading(false);
    }
  };

  const checkAnswer = useCallback((qIndex, option) => {
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }));
  }, []);

  const toggleCard = useCallback((index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const getUploadStatusClass = () => {
    if (uploadStatus.includes("Ready") || uploadStatus.includes("🎉")) return "ready";
    if (uploadStatus.includes("Uploading")) return "uploading";
    if (uploadStatus.includes("failed")) return "error";
    return "";
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setUploadStatus(`Ready to upload: ${droppedFile.name}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>Exam Crusher AI</h1>
        <div className="session-badge">
          <span>📱</span>
          Session: {sessionId}
        </div>
      </header>

      {/* Upload Section */}
      <div 
        className="upload-section"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <div className="file-input-wrapper">
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".pdf" 
            onChange={(e) => {
              setFile(e.target.files[0]);
              setUploadStatus(`Ready to upload: ${e.target.files[0].name}`);
            }}
          />
        </div>
        <button 
          className="upload-button"
          onClick={handleUpload}
          disabled={!file}
        >
          <span>⚡</span>
          Process PDF
        </button>
        {uploadStatus && (
          <div className={`status-indicator ${getUploadStatusClass()}`}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div 
          className="tab-indicator"
          style={{
            width: `calc(100% / 3 - 0.5rem)`,
            transform: `translateX(${activeTab === 'chat' ? '0' : activeTab === 'quiz' ? '100%' : '200%'})`
          }}
        />
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span>💬</span>
          AI Chat
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <span>📝</span>
          Quiz Master
        </button>
        <button 
          className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcards')}
        >
          <span>🎴</span>
          Smart Cards
        </button>
      </div>

      {/* Content Area */}
      <div className="content-area">
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="chat-view">
            <div className="chat-header">
              <h2>🤖 AI Learning Assistant</h2>
              <p>Ask anything about your uploaded document</p>
            </div>
            
            <div className="chat-messages">
              {chatHistory.length === 0 && (
                <div className="welcome-message">
                  <div className="message bot">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <div className="message-bubble">
                        <h3>Welcome to Exam Crusher AI! 🎓</h3>
                        <p>I'm here to help you learn from your uploaded documents. You can:</p>
                        <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
                          <li>📚 Ask questions about your document</li>
                          <li>🧠 Get explanations in simple terms</li>
                          <li>🔍 Request summaries or key points</li>
                          <li>📝 Generate quizzes from the content</li>
                          <li>🎴 Create flashcards for memorization</li>
                        </ul>
                        <p style={{ marginTop: '1rem' }}>What would you like to learn today?</p>
                      </div>
                      <div className="message-time">Just now</div>
                    </div>
                  </div>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble">
                      {msg.content}
                    </div>
                    <div className="message-time">{msg.timestamp}</div>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="message bot">
                  <div className="message-avatar">🤖</div>
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="chat-input-area">
              <form onSubmit={handleChat} className="chat-form">
                <div className="chat-input-wrapper">
                  <input 
                    type="text"
                    className="chat-input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Type your question here..."
                    disabled={isChatLoading}
                  />
                </div>
                <button 
                  type="submit"
                  className="chat-send-btn"
                  disabled={isChatLoading || !question.trim()}
                >
                  <span>🚀</span>
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="quiz-view">
            <div className="quiz-header">
              <h2 className="quiz-title">Quiz Master 🏆</h2>
              <p>Test your knowledge with AI-generated questions</p>
            </div>
            
            {quizScore && (
              <div className="quiz-stats">
                <div className="stat-card">
                  <div className="stat-value">{quizScore.correct}/{quizScore.total}</div>
                  <div className="stat-label">Correct Answers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{quizScore.percentage}%</div>
                  <div className="stat-label">Score</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {quizScore.percentage >= 80 ? '🎯' : 
                     quizScore.percentage >= 60 ? '👍' : 
                     '📚'}
                  </div>
                  <div className="stat-label">Performance</div>
                </div>
              </div>
            )}
            
            {!quizData ? (
              <div className="placeholder">
                <button 
                  className="generate-quiz-btn"
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                >
                  {quizLoading ? (
                    <>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <span>🎲</span>
                      Generate Smart Quiz
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="quiz-list">
                  {quizData.map((q, qIdx) => (
                    <div key={qIdx} className="quiz-card">
                      <h3 className="quiz-question">
                        <span className="question-number">{qIdx + 1}.</span> {q.question}
                      </h3>
                      
                      <div className="options-grid">
                        {q.options.map((opt) => {
                          const isSelected = selectedAnswers[qIdx] === opt;
                          const isCorrect = opt === q.correct_answer;
                          const showResult = !!selectedAnswers[qIdx];
                          
                          let btnClass = "option-btn";
                          if (isSelected) btnClass += " selected";
                          if (showResult) {
                            if (isCorrect) btnClass += " correct";
                            else if (isSelected) btnClass += " wrong";
                          }
                          
                          return (
                            <button
                              key={opt}
                              className={btnClass}
                              onClick={() => checkAnswer(qIdx, opt)}
                              disabled={showResult}
                            >
                              {opt}
                              {showResult && isCorrect && " ✓"}
                              {showResult && isSelected && !isCorrect && " ✗"}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="quiz-progress">
                        <div 
                          className="quiz-progress-bar"
                          style={{ 
                            width: `${((qIdx + 1) / quizData.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  className="generate-quiz-btn"
                  onClick={handleGenerateQuiz}
                >
                  <span>🔄</span>
                  Generate New Quiz
                </button>
              </>
            )}
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="cards-view">
            <div className="cards-header">
              <h2 className="cards-title">Smart Flashcards 🎴</h2>
              <p>Flip cards to memorize key terms and concepts</p>
            </div>
            
            <div className="cards-controls">
              <button className="control-btn">
                <span>🔀</span>
                Shuffle
              </button>
              <button className="control-btn">
                <span>⭐</span>
                Mark Difficult
              </button>
              <button className="control-btn">
                <span>📊</span>
                Progress
              </button>
            </div>
            
            {!flashcards ? (
              <div className="placeholder">
                <button 
                  className="generate-cards-btn"
                  onClick={handleGenerateFlashcards}
                  disabled={cardsLoading}
                >
                  {cardsLoading ? (
                    <>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      Mining Key Terms...
                    </>
                  ) : (
                    <>
                      <span>🎴</span>
                      Generate Smart Flashcards
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="cards-grid">
                  {flashcards.map((card, idx) => (
                    <div 
                      key={`${currentCardSet}-${idx}`}
                      className={`flashcard ${flippedCards[idx] ? 'flipped' : ''}`}
                      onClick={() => toggleCard(idx)}
                    >
                      <div className="card-inner">
                        <div className="card-face card-front">
                          <div className="card-number">{idx + 1}</div>
                          <h3 className="card-term">{card.term}</h3>
                          <p className="card-hint">Click to flip</p>
                        </div>
                        <div className="card-face card-back">
                          <div className="card-number">{idx + 1}</div>
                          <p className="card-definition">{card.definition}</p>
                          <p className="card-hint">Click to flip back</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  className="generate-cards-btn"
                  onClick={handleGenerateFlashcards}
                >
                  <span>🔄</span>
                  Generate New Set
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;