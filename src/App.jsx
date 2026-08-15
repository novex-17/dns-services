import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Settings, X, Copy, Check, Sparkles } from 'lucide-react';
import { generateFacebookCaption } from './services/gemini';
import './App.css';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
    if (!savedKey) setShowSettings(true);
  }, []);

  const handleSaveApiKey = (e) => {
    setApiKey(e.target.value);
    localStorage.setItem('gemini_api_key', e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    
    setFiles((prev) => [...prev, ...selectedFiles]);
    
    // Generate previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError('กรุณาใส่ API Key ของ Gemini ก่อนใช้งาน');
      setShowSettings(true);
      return;
    }
    if (files.length === 0) {
      setError('กรุณาอัพโหลดรูปภาพไม้กอล์ฟก่อน');
      return;
    }

    setIsGenerating(true);
    setError('');
    setResult('');
    
    try {
      const generatedText = await generateFacebookCaption(apiKey, files);
      setResult(generatedText);
    } catch (err) {
      setError('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถสร้างข้อความได้'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-navbar">
        <div className="brand">
          <div className="logo-icon">
            <Sparkles size={24} />
          </div>
          <h1>DNS Golf Caption Generator</h1>
        </div>

        <button 
          className="btn btn-secondary icon-btn" 
          onClick={() => setShowSettings(!showSettings)}
          title="ตั้งค่า API Key"
        >
          <Settings size={18} />
          <span>ตั้งค่า API</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="main-content generator-layout">
        
        {showSettings && (
          <div className="glass-panel settings-panel animate-fade-in">
            <h3>การตั้งค่า Gemini API</h3>
            <p className="text-muted">กรุณาใส่ API Key ของ Google Gemini เพื่อให้ระบบ AI ทำงานได้ (ข้อมูลนี้จะถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น)</p>
            <div className="input-group mt-3">
              <input 
                type="password" 
                className="input-field" 
                placeholder="ใส่ Gemini API Key ที่นี่..." 
                value={apiKey}
                onChange={handleSaveApiKey}
              />
            </div>
            <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
              ไม่มี API Key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>รับ API Key ฟรีที่ Google AI Studio</a>
            </p>
          </div>
        )}

        <div className="workspace-grid">
          {/* Left Column: Upload */}
          <div className="glass-panel upload-section">
            <h2>อัพโหลดรูปภาพ</h2>
            <p className="text-muted mb-4">เพิ่มรูปไม้กอล์ฟเพื่อดูรายละเอียด และสร้าง Caption</p>
            
            <div 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} className="text-muted mb-2" />
              <h3>คลิกเพื่อเลือกรูปภาพ</h3>
              <p className="text-muted">รองรับหลายรูปภาพ (Driver, เหล็ก, ป้ายราคา)</p>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {previews.length > 0 && (
              <div className="preview-grid">
                {previews.map((src, idx) => (
                  <div key={idx} className="preview-item">
                    <img src={src} alt={`preview-${idx}`} />
                    <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="btn btn-primary w-full mt-4 generate-btn" 
              onClick={handleGenerate}
              disabled={isGenerating || files.length === 0}
            >
              {isGenerating ? (
                <>
                  <span className="loader"></span>
                  กำลังวิเคราะห์รูปภาพ...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  สร้าง Caption เลย
                </>
              )}
            </button>
            {error && <p className="error-text mt-2">{error}</p>}
          </div>

          {/* Right Column: Result */}
          <div className="glass-panel result-section">
            <div className="result-header">
              <h2>ผลลัพธ์ Caption</h2>
              <button 
                className={`btn ${copied ? 'btn-success' : 'btn-secondary'}`} 
                onClick={handleCopy}
                disabled={!result}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}
              </button>
            </div>
            
            <div className="result-body">
              <textarea 
                className="result-textarea" 
                placeholder="ข้อความ Facebook จะแสดงที่นี่..."
                value={result}
                onChange={(e) => setResult(e.target.value)}
                readOnly={isGenerating}
              ></textarea>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
