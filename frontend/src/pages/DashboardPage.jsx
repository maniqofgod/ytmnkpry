import React from 'react';
import MainTabs from '../components/MainTabs';
import './DashboardPage.css';

function DashboardPage({ onLogout, user }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Youtube Uploader</h1>
        <div className="user-info">
          <span>Selamat datang, {user.username}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>
        <MainTabs user={user} />
      </main>
    </div>
  );
}

export default DashboardPage;