import React, { useState, useEffect } from 'react';
import { getTasks, exportTasksToCSV, subscribeToTasks } from '../services/db';
import TaskCard from './TaskCard';
import DailyReportModal from './DailyReportModal';
import { ClipboardList, Clock, PlayCircle, CheckCircle2, Download, FileText } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [showReport, setShowReport] = useState(false);

  const loadTasks = () => {
    setTasks(getTasks());
  };

  useEffect(() => {
    loadTasks();
    const unsubscribe = subscribeToTasks((newTasks) => {
      setTasks(newTasks);
    });
    return () => unsubscribe();
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Service Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>ติดตามสถานะงานบริการลูกค้า</p>
        </div>
        
        <div className="dashboard-stats">
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={() => setShowReport(true)}
            title="Generate Daily Report and Archive"
          >
            <FileText size={18} />
            Daily Report
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            onClick={exportTasksToCSV}
            title="Export data to low-storage CSV file"
          >
            <Download size={18} />
            Export CSV
          </button>
          
          <div className="stat-badge">
            <ClipboardList size={18} color="var(--primary)" />
            Total: {tasks.length}
          </div>
        </div>
      </div>

      {showReport && (
        <DailyReportModal 
          onClose={() => setShowReport(false)} 
          onArchived={loadTasks} 
        />
      )}

      <div className="kanban-board">
        {/* Pending Column */}
        <div className="kanban-column">
          <div className="column-header">
            <Clock color="var(--warning)" />
            รอดำเนินการ
            <span className="count">{pendingTasks.length}</span>
          </div>
          <div className="task-list">
            {pendingTasks.length === 0 ? (
              <div className="empty-state">ไม่มีงานรอดำเนินการ</div>
            ) : (
              pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} onTaskUpdated={loadTasks} />
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="kanban-column">
          <div className="column-header">
            <PlayCircle color="var(--primary)" />
            กำลังดำเนินการ
            <span className="count">{inProgressTasks.length}</span>
          </div>
          <div className="task-list">
            {inProgressTasks.length === 0 ? (
              <div className="empty-state">ไม่มีงานกำลังดำเนินการ</div>
            ) : (
              inProgressTasks.map(task => (
                <TaskCard key={task.id} task={task} onTaskUpdated={loadTasks} />
              ))
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="kanban-column">
          <div className="column-header">
            <CheckCircle2 color="var(--secondary)" />
            เสร็จสิ้น
            <span className="count">{completedTasks.length}</span>
          </div>
          <div className="task-list">
            {completedTasks.length === 0 ? (
              <div className="empty-state">ยังไม่มีงานที่เสร็จสิ้น</div>
            ) : (
              completedTasks.map(task => (
                <TaskCard key={task.id} task={task} onTaskUpdated={loadTasks} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
