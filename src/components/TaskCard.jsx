import React from 'react';
import { updateTaskStatus, deleteTask, SERVICE_CATEGORIES, parseOption } from '../services/db';
import { User, CheckCircle2, Clock, Trash2, PlayCircle } from 'lucide-react';
import './TaskCard.css';

const TaskCard = ({ task, onTaskUpdated }) => {
  if (!task) return null;

  const getCategoryName = (id) => {
    const cat = SERVICE_CATEGORIES.find(c => c.id === id);
    return cat ? cat.name : id;
  };

  const handleStatusChange = (newStatus) => {
    if (task && task.id) {
      updateTaskStatus(task.id, newStatus);
      if (onTaskUpdated) onTaskUpdated();
    }
  };

  const handleDelete = () => {
    const custName = task?.customer || 'Unknown';
    if (window.confirm(`Are you sure you want to delete the request for ${custName}?`)) {
      if (task && task.id) {
        deleteTask(task.id);
        if (onTaskUpdated) onTaskUpdated();
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Check for Invalid Date
      if (isNaN(date.getTime())) return '';
      
      return new Intl.DateTimeFormat('th-TH', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  const calculatePrice = () => {
    let total = 0;
    let hasTBD = false;

    if (task && task.services && typeof task.services === 'object') {
      Object.entries(task.services).forEach(([catId, data]) => {
        const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
        let catBaseAdded = false;

        if (data && data.options && Array.isArray(data.options)) {
          data.options.forEach(opt => {
            const parsed = parseOption(opt);
            const optionObj = cat?.options?.find(o => o.name === parsed.name);
            
            if (optionObj) {
              if (optionObj.price !== null && optionObj.price !== undefined) {
                total += (optionObj.price * parsed.count);
              } else {
                hasTBD = true;
              }
            } else {
              hasTBD = true;
            }
            
            if (cat?.basePrice && !catBaseAdded) {
              total += cat.basePrice;
              catBaseAdded = true;
            }
          });
        }
      });
    }

    if (hasTBD) {
      return total > 0 ? `${total.toLocaleString()}฿ + (TBD)` : 'TBD';
    }
    return `${total.toLocaleString()}฿`;
  };

  const customerName = typeof task.customer === 'string' ? task.customer : 'Unknown Customer';
  const status = typeof task.status === 'string' ? task.status : 'pending';

  return (
    <div className={`task-card ${status === 'completed' ? 'completed' : ''}`}>
      <div className="task-header">
        <div>
          <div className="task-customer">
            <User size={18} />
            {customerName}
          </div>
          <div className="task-date">{formatDate(task.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div className={`task-status-badge status-${status}`}>
            {status === 'pending' && 'รอดำเนินการ'}
            {status === 'in-progress' && 'กำลังดำเนินการ'}
            {status === 'completed' && 'เสร็จสิ้น'}
          </div>
          {status === 'completed' && (
            <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
              Total: {calculatePrice()}
            </div>
          )}
        </div>
      </div>

      <div className="task-services">
        {task.services && typeof task.services === 'object' && Object.entries(task.services).map(([catId, data]) => (
          <div key={catId} className="service-item">
            <div className="service-category-name">{getCategoryName(catId)}</div>
            <div className="service-options">
              {data && data.options && Array.isArray(data.options) && data.options.map((opt, idx) => {
                const parsed = parseOption(opt);
                return (
                  <span key={idx} className="service-tag">
                    {parsed.name} {parsed.count > 1 ? `x${parsed.count}` : ''}
                  </span>
                );
              })}
            </div>
            {data && data.details && typeof data.details === 'string' && (
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
        
        {status !== 'in-progress' && status !== 'completed' && (
          <button 
            className="btn btn-secondary btn-small"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={() => handleStatusChange('in-progress')}
          >
            <PlayCircle size={16} /> Start
          </button>
        )}
        
        {status !== 'completed' && (
          <button 
            className="btn btn-secondary btn-small"
            style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
            onClick={() => handleStatusChange('completed')}
          >
            <CheckCircle2 size={16} /> Complete
          </button>
        )}
        
        {status === 'completed' && (
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
