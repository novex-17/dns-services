import React, { useState, useEffect } from 'react';
import { generateDailyReport, archiveCompletedTasks } from '../services/db';
import { X, Copy, Archive } from 'lucide-react';
import './DailyReportModal.css';

const DailyReportModal = ({ onClose, onArchived }) => {
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setReportText(generateDailyReport());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleArchive = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะย้ายงานที่ "เสร็จสิ้น" ไปเก็บในฐานข้อมูล? (Are you sure you want to archive all completed tasks?)')) {
      const count = archiveCompletedTasks();
      alert(`เก็บข้อมูลสำเร็จ ${count} รายการ (Archived ${count} tasks)`);
      onArchived(); // Refresh the dashboard
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <h3>Daily Report & Archive</h3>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          คัดลอกข้อความนี้เพื่อส่งรายงานให้หัวหน้า เมื่อจบวันให้กด "Archive" เพื่อซ่อนงานที่เสร็จแล้วจากหน้ากระดานหลัก
        </p>

        <textarea 
          className="report-textarea" 
          value={reportText} 
          readOnly 
        />

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleCopy}>
            <Copy size={18} />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          
          <button className="btn btn-primary" onClick={handleArchive} style={{ backgroundColor: 'var(--danger)', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.5)' }}>
            <Archive size={18} />
            Archive Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyReportModal;
