import React, { useState } from 'react';
import api from '../api';

function LoginPage({ onLogin }) { // Mengubah nama prop menjadi onLogin
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', {
                username,
                password,
            });
            // Sekarang kita meneruskan seluruh objek user dan token
            const { token, user } = response.data; 
            onLogin(user, token); // Memanggil onLogin dengan data yang benar
        } catch (err) {
            setError('Login gagal. Periksa kembali username dan password Anda.');
            console.error(err);
        }
    };

    return (
        <div className="login-page" style={{
            backgroundColor: '#0d1117',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <form onSubmit={handleLogin} className="login-form" style={{
                backgroundColor: '#161b22',
                padding: '40px',
                borderRadius: '12px',
                border: '1px solid #30363d',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h2 style={{
                    color: '#c9d1d9',
                    textAlign: 'center',
                    marginBottom: '30px',
                    fontSize: '28px',
                    fontWeight: 'bold'
                }}>🔐 Login</h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        color: '#c9d1d9',
                        marginBottom: '8px',
                        fontWeight: '500'
                    }}>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            backgroundColor: '#0d1117',
                            color: '#c9d1d9',
                            fontSize: '16px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        color: '#c9d1d9',
                        marginBottom: '8px',
                        fontWeight: '500'
                    }}>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #30363d',
                            borderRadius: '8px',
                            backgroundColor: '#0d1117',
                            color: '#c9d1d9',
                            fontSize: '16px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {error && <p style={{
                    color: '#f85149',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontSize: '14px'
                }}>{error}</p>}

                <button type="submit" style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#238636',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}>Login</button>
            </form>
        </div>
    );
}

export default LoginPage;