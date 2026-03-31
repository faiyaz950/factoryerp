import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Lock, Mail, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, verify2FA, loading, requires2FA } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await login(email, password);
      if (result.requires2FA) {
        setDevOtp(result.otpCode || '');
        toast.success('OTP sent! Check console for dev OTP.');
      } else {
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await verify2FA(otpCode);
      toast.success('Verified! Welcome back.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Verification failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="logo">🏭</div>
          <h1>FactoryERP</h1>
          <p>Plastic Manufacturing Management System</p>
        </div>

        {!requires2FA ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  placeholder="admin@factory.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button id="login-submit" type="submit" className="login-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Shield size={48} style={{ color: 'var(--primary)', marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, marginBottom: 4 }}>Two-Factor Authentication</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enter the 6-digit OTP code</p>
            </div>
            {devOtp && (
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <Shield size={16} /> Dev OTP: <strong>{devOtp}</strong>
              </div>
            )}
            <div className="form-group">
              <input
                id="otp-input"
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 }}
                required
              />
            </div>
            <button id="verify-submit" type="submit" className="login-btn" disabled={loading || otpCode.length < 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
          Secure factory management system • v1.0
        </p>
      </div>
    </div>
  );
}
