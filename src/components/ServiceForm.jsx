import React, { useState } from 'react';
import { SERVICE_CATEGORIES, addTask } from '../services/db';
import { Save, User } from 'lucide-react';
import './ServiceForm.css';

const ServiceForm = ({ onTaskAdded }) => {
  const [customerInfo, setCustomerInfo] = useState('');
  const [selectedServices, setSelectedServices] = useState({});
  const [serviceDetails, setServiceDetails] = useState({});

  const handleOptionChange = (categoryId, option) => {
    setSelectedServices(prev => {
      const categorySelections = prev[categoryId] || [];
      if (categorySelections.includes(option)) {
        return { ...prev, [categoryId]: categorySelections.filter(o => o !== option) };
      } else {
        return { ...prev, [categoryId]: [...categorySelections, option] };
      }
    });
  };

  const handleDetailsChange = (categoryId, value) => {
    setServiceDetails(prev => ({ ...prev, [categoryId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerInfo.trim()) {
      alert('กรุณากรอกชื่อลูกค้า (Please enter customer name)');
      return;
    }

    // Filter out empty categories
    const activeServices = {};
    Object.keys(selectedServices).forEach(key => {
      if (selectedServices[key].length > 0) {
        activeServices[key] = {
          options: selectedServices[key],
          details: serviceDetails[key] || ''
        };
      }
    });

    if (Object.keys(activeServices).length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 บริการ (Please select at least 1 service)');
      return;
    }

    const newTask = {
      customer: customerInfo,
      services: activeServices
    };

    addTask(newTask);
    
    // Reset form
    setCustomerInfo('');
    setSelectedServices({});
    setServiceDetails({});
    
    if (onTaskAdded) onTaskAdded();
  };

  return (
    <div className="service-form-container glass-panel">
      <div className="form-header">
        <h2 className="text-gradient">New Service Request</h2>
        <p>บันทึกข้อมูลการรับบริการของลูกค้า</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="customer-section">
          <div className="input-group">
            <label className="input-label">Customer Name or Phone / ชื่อหรือเบอร์โทรศัพท์ลูกค้า</label>
            <div style={{ position: 'relative' }}>
              <User size={20} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field customer-input"
                style={{ paddingLeft: '3rem' }}
                placeholder="e.g. คุณจอห์น หรือ 0812345678"
                value={customerInfo}
                onChange={(e) => setCustomerInfo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Select Services / เลือกบริการ</h3>
        
        <div className="services-grid">
          {SERVICE_CATEGORIES.map(category => (
            <div key={category.id} className="category-card">
              <h4 className="category-title">{category.name}</h4>
              <div className="options-list">
                {category.options.map(option => (
                  <label key={option.name} className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={selectedServices[category.id]?.includes(option.name) || false}
                      onChange={() => handleOptionChange(category.id, option.name)}
                    />
                    <div className="checkmark"></div>
                    <span className="checkbox-label">
                      <span>{option.name}</span>
                      {option.price !== null && option.price > 0 && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {option.price}฿
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                
                {/* Show details input for all categories except laser if at least one option is selected */}
                {(category.id !== 'laser' && selectedServices[category.id]?.length > 0) && (
                  <textarea
                    className="input-field details-input animate-fade-in"
                    placeholder={category.detailsPlaceholder || "ระบุรายละเอียดเพิ่มเติม..."}
                    value={serviceDetails[category.id] || ''}
                    onChange={(e) => handleDetailsChange(category.id, e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="submit-section">
          <button type="submit" className="btn btn-primary btn-submit">
            <Save size={24} />
            Save Request (บันทึกข้อมูล)
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm;
