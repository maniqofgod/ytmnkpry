import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { LogProvider } from './contexts/LogContext';
import './App.css';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const userDataString = localStorage.getItem('user');
        // Tambahkan pemeriksaan untuk memastikan userDataString adalah JSON yang valid
        if (token && userDataString && userDataString !== 'undefined') {
            try {
                const userData = JSON.parse(userDataString);
                // Auto-login jika masih ada token valid
                setUser(userData);
            } catch (error) {
                console.error("Gagal mem-parsing data pengguna dari localStorage:", error);
                // Hapus data yang tidak valid
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        }
    }, []);

    const handleLogin = (userData, token) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <LogProvider>
            <div className="App">
                {user ? (
                    <DashboardPage user={user} onLogout={handleLogout} />
                ) : (
                    <LoginPage onLogin={handleLogin} />
                )}
            </div>
        </LogProvider>
    );
}

export default App;
