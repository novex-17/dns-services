import React, { useState } from 'react';
import { SERVICE_CATEGORIES, addTask } from '../services/db';
import { Save, User, Plus, Minus } from 'lucide-react';
import './ServiceForm.css';

const ServiceForm = ({ onTaskAdded }) => {
  const [customerInfo, setCustomerInfo] = useState('');
  const [selectedServices, setSelectedServices] = useState({});
  const [serviceDetails, setServiceDetails] = useState({});

  // Get current count for a category option
  const getCount = (categoryId, optionName) => {
    return selectedServices[categoryId]?.[optionName] || 0;
  };

  // Toggle or change quantity
  const handleQuantityChange = (categoryId, optionName, delta) => {
    setSelectedServices(prev => {
      const catMap = { ...(prev[categoryId] || {}) };
      const currentCount = catMap[optionName] || 0;
      const newCount = Math.max(0, currentCount + delta);

      if (newCount === 0) {
        delete catMap[optionName];
      } else {
        catMap[optionName] = newCount;
      }

      return {
        ...prev,
        [categoryId]: catMap
      };
    });
  };

  // Toggle checkbox directly
  const handleCheckboxToggle = (categoryId, optionName) => {
    const currentCount = getCount(categoryId, optionName);
    if (currentCount > 0) {
      handleQuantityChange(categoryId, optionName, -currentCount); // Reset to 0
    } else {
      handleQuantityChange(categoryId, optionName, 1); // Set to 1
    }
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
      const catObj = selectedServices[key];
      const selectedOptions = Object.entries(catObj)
        .filter(([_, count]) => count > 0)
        .map(([name, count]) => ({ name, count }));

      if (selectedOptions.length > 0) {
        activeServices[key] = {
          options: selectedOptions,
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
          {SERVICE_CATEGORIES.map(category => {
            const hasSelectedOptions = Object.keys(selectedServices[category.id] || {}).length > 0;

            return (
              <div key={category.id} className="category-card">
                <h4 className="category-title">{category.name}</h4>
                <div className="options-list">
                  {category.options.map(option => {
                    const count = getCount(category.id, option.name);
                    const isChecked = count > 0;

                    return (
                      <div key={option.name} className="option-row">
                        <label className="checkbox-container" style={{ flexGrow: 1 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxToggle(category.id, option.name)}
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

                        {/* Compact Quantity (+ / -) Counter */}
                        <div className="qty-counter">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleQuantityChange(category.id, option.name, -1)}
                            disabled={count === 0}
                            style={{ opacity: count === 0 ? 0.3 : 1 }}
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className={`qty-count ${count === 0 ? 'zero' : ''}`}>
                            {count}
                          </span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleQuantityChange(category.id, option.name, 1)}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show details input for all categories except laser if at least one option is selected */}
                  {(category.id !== 'laser' && hasSelectedOptions) && (
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
            );
          })}
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
