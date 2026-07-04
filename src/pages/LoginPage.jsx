import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Quá nhiều lần thử. Vui lòng chờ một lát.');
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-accent-50 via-[#FBF6ED] to-brand-50 flex items-center justify-center px-4">
      {/* Background soft blob */}
      <svg className="absolute w-[600px] h-[600px] opacity-10 text-accent-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,76.5,41.2C67.4,55.5,57.8,69.4,44.7,78.5C31.6,87.6,15.8,91.9,0.3,91.4C-15.2,90.9,-30.4,85.6,-43.3,76.3C-56.2,67,-66.8,53.7,-75.6,39.2C-84.4,24.7,-91.4,9,-90.4,-6.2C-89.4,-21.4,-80.4,-36.1,-70.3,-49C-60.2,-61.9,-49,-73,-35.6,-79.8C-22.2,-86.6,-6.6,-89.1,7.8,-87.3C22.2,-85.5,44.4,-79.4,44.7,-76.4Z" transform="translate(100 100)" />
      </svg>
      
      <div className="w-full max-w-sm animate-fade-in relative z-10">
        {/* Logo area */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Fortify Kitchen Logo" className="w-24 h-24 mx-auto mb-4 object-contain drop-shadow-md" />
          <h1 className="text-2xl font-bold text-stone-800 font-display">Fortify Kitchen</h1>
          <p className="text-sm text-stone-500 mt-1">Hệ thống quản lý nội bộ</p>
        </div>

        {/* Login card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-warm-lg p-6 border border-white">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-smooth"
                placeholder="admin@fortifykitchen.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-smooth"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-smooth cursor-pointer border-0 text-sm"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          © 2026 Fortify Kitchen — Dành cho sử dụng nội bộ
        </p>
      </div>
    </div>
  );
}
