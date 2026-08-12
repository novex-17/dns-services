import React from 'react';
import { updateTaskStatus, deleteTask, SERVICE_CATEGORIES } from '../services/db';
import { User, CheckCircle2, Clock, Trash2, PlayCircle } from 'lucide-react';
import './TaskCard.css';

const TaskCard = ({ task, onTaskUpdated }) => {
  const getCategoryName = (id) => {
    const cat = SERVICE_CATEGORIES.find(c => c.id === id);
    return cat ? cat.name : id;
  };

  const handleStatusChange = (newStatus) => {
    updateTaskStatus(task.id, newStatus);
    onTaskUpdated();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the request for ${task.customer}?`)) {
      deleteTask(task.id);
      onTaskUpdated();
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('th-TH', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(date);
  };

  const calculatePrice = () => {
    let total = 0;
    let hasTBD = false;

    Object.entries(task.services).forEach(([catId, data]) => {
      const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
      let catBaseAdded = false;

      data.options.forEach(optName => {
        const option = cat?.options.find(o => o.name === optName);
        if (option) {
          if (option.price !== null) {
            total += option.price;
          } else {
            hasTBD = true;
          }
        }
        
        if (cat?.basePrice && !catBaseAdded) {
          total += cat.basePrice;
          catBaseAdded = true;
        }
      });
    });

    if (hasTBD) {
      return total > 0 ? `${total.toLocaleString()}฿ + (TBD)` : 'TBD';
    }
    return `${total.toLocaleString()}฿`;
  };

  return (
    <div className={`task-card ${task.status === 'completed' ? 'completed' : ''}`}>
      <div className="task-header">
        <div>
          <div className="task-customer">
            <User size={18} />
            {task.customer}
          </div>
          <div className="task-date">{formatDate(task.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div className={`task-status-badge status-${task.status}`}>
            {task.status === 'pending' && 'รอดำเนินการ'}
            {task.status === 'in-progress' && 'กำลังดำเนินการ'}
            {task.status === 'completed' && 'เสร็จสิ้น'}
          </div>
          {task.status === 'completed' && (
            <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
              Total: {calculatePrice()}
            </div>
          )}
        </div>
      </div>

      <div className="task-services">
        {Object.entries(task.services).map(([catId, data]) => (
          <div key={catId} className="service-item">
            <div className="service-category-name">{getCategoryName(catId)}</div>
            <div className="service-options">
              {data.options.map(opt => (
                <span key={opt} className="service-tag">{opt}</span>
              ))}
            </div>
            {data.details && (
              <span className="service-details">📝 {data.details}</span>
            )}
          </div>
        ))}
      </div>

      <div className="task-actions">
        <button 
          className="btn btn-secondary btn-small"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginRight: 'auto' }}
          onClick={handleDelete}
        >
          <Trash2 size={16} /> Delete
        </button>
        
        {task.status !== 'in-progress' && task.status !== 'completed' && (
          <button 
            className="btn btn-secondary btn-small"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={() => handleStatusChange('in-progress')}
          >
            <PlayCircle size={16} /> Start
          </button>
        )}
        
        {task.status !== 'completed' && (
          <button 
            className="btn btn-secondary btn-small"
            style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
            onClick={() => handleStatusChange('completed')}
          >
            <CheckCircle2 size={16} /> Complete
          </button>
        )}
        
        {task.status === 'completed' && (
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => handleStatusChange('pending')}
          >
            <Clock size={16} /> Reopen
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
