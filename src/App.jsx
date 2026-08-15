import React, { useState } from 'react';
import ServiceForm from './components/ServiceForm';
import Dashboard from './components/Dashboard';
import { PlusCircle, LayoutDashboard, Flag } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('new-request');

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="top-navbar">
        <div className="brand">
          <div className="logo-icon">
            <Flag size={24} />
          </div>
          <h1>DNS Golf Store</h1>
        </div>

        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'new-request' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-request')}
          >
            <PlusCircle size={18} />
            New Request
          </button>
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'new-request' && (
          <ServiceForm onTaskAdded={() => setActiveTab('dashboard')} />
        )}
        
        {activeTab === 'dashboard' && (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

export default App;
