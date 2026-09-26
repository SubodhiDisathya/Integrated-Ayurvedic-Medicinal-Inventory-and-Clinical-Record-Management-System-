import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import './Login.css';

// Images Import Links
import bgFlowers from '../assets/bg-flowers.jpg';
import logoTop from '../assets/logo-top.png';
import ayurvedaImg from '../assets/ayurveda-side.png';
import bottomShape from '../assets/bottom-shape.png';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const form = e.target.elements;
    const role = form.role.value;
    const email = form.email.value.trim();
    const password = form.password.value;

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (role === 'doctor') navigate('/doctor');
      else if (role === 'ticket') navigate('/ticket-counter');
     else if (role === 'staff' || role === 'pharmacist') navigate('/pharmacy/dashboard');
      else if (role === 'supplier') navigate('/supplier');
      else if (role === 'admin') navigate('/admin');

    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('විද්‍යුත් තැපෑල හෝ මුරපදය වැරදිය.');
      } else if (err.code === 'auth/invalid-email') {
        setError('වලංගු නොවන විද්‍යුත් තැපැල් ලිපිනයකි.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ayur-main-bg-wrapper"
      style={{ backgroundImage: `url(${bgFlowers})` }}
    >
      <div className="ayur-central-workspace-card">

        {/* ================= LEFT SIDE: FIXED AYURVEDA LAYOUT ================= */}
        <div className="ayur-card-left-visual">

          {/* Logo & Brand */}
          <div className="ayur-left-header">
            <img src={logoTop} alt="Ayurveda Logo" className="ayur-left-logo" />
            <div className="ayur-left-brand">
              <h2>ආයුර්වේද</h2>
              <span className="sub-tagline">ආයුෂ · සුවය · සමබරතාවය</span>
            </div>
          </div>

          {/* Centered Main Title */}
          <div className="ayur-topic-container">
            <h1 className="ayur-left-main-title">
              ජාතික ආයුර්වේද <br />
              ඖෂධ තොග හා <br />
              රෝගී සත්කාර කළමනාකරණ 
            </h1>
          </div>

          {/* Features Section */}
          <div className="ayur-left-features-shifted">
            <div className="feature-item">
              <div className="feature-circle-css-icon">🌱</div>
              <div>
                <h4>ස්වභාවික සහ ආරක්ෂිතයි</h4>
                <p>100% ස්වභාවික ආයුර්වේද අමුද්‍රව්‍ය</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-circle-css-icon">🌿</div>
              <div>
                <h4>පූර්ණ සුවතාවය</h4>
                <p>ඔබේ කය, මනස සහ ආත්මයේ සමතුලිතතාවය</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-circle-css-icon">📜</div>
              <div>
                <h4>දේශීය හෙළ වෙදකම</h4>
                <p>පරපුරෙන් පරපුරට රැකගත් සැබෑ ආයුර්වේද රහස්</p>
              </div>
            </div>
          </div>

          {/* Footer Area */}
          <div className="ayur-left-footer-zone">
            <div className="ayur-image-lifted-right">
              <img src={ayurvedaImg} alt="Ayurvedic Treatment" className="ayur-mortar-img" />
            </div>
            <p className="ayur-final-sentence">“ස්වභාවික සුවය තුළින් සෞඛ්‍ය සම්පන්න අනාගතයක්”</p>
          </div>

          {/* Bottom Green Shape */}
          <div className="ayur-bottom-shape-frame">
            <img src={bottomShape} alt="Green Wave Bar" />
          </div>
        </div>

        {/* ================= RIGHT SIDE: LOGIN FORM ONLY ================= */}
        <div className="ayur-card-right-white-box">
          <div className="ayur-box-header">
            <h2>පද්ධතියට <span>ඇතුළු වන්න</span></h2>
            <p>කරුණාකර ඔබේ භූමිකාව සහ අක්තපත්‍ර ඇතුළත් කරන්න</p>
          </div>

          <form className="ayur-white-form Login-form-spacing" onSubmit={handleLogin}>

            {error && <p className="error-msg" role="alert">{error}</p>}

            {/* 1. භූමිකාව තෝරන්න */}
            <div className="input-group-cell">
              <label>භූමිකාව තෝරන්න/ Choose Your Role</label>
              <div className="input-with-icon">
                <span className="field-icon">💼</span>
                <select name="role" required defaultValue="">
                  <option value="" disabled>ඔබේ භූමිකාව තෝරන්න/ Choose Your Role...</option>
                  <option value="ticket">ප්‍රවේශපත්‍ර කවුන්ටරයය/ Ticket Counter</option>
                  <option value="doctor">වෛද්‍යවරයා/ Doctor</option>
                  <option value="staff">ෆාමසිකරු / කාර්ය මණ්ඩලය/ Pharmacy Staff</option>
                  <option value="supplier">සැපයුම්කරු/ Supplier</option>
                  <option value="admin">පරිපාලක/ Admin</option>
                </select>
              </div>
            </div>

            {/* 2. විද්‍යුත් තැපෑල */}
            <div className="input-group-cell">
              <label>විද්‍යුත් තැපෑල/ Email</label>
              <div className="input-with-icon">
                <span className="field-icon">✉️</span>
                <input type="email" name="email" placeholder="විද්‍යුත් තැපෑල ඇතුළත් කරන්න" required />
              </div>
            </div>

            {/* 3. මුරපදය */}
            <div className="input-group-cell">
              <label>මුරපදය/ Password</label>
              <div className="input-with-icon">
                <span className="field-icon">🔒</span>
                <input type="password" name="password" placeholder="මුරපදය ඇතුළත් කරන්න" required />
              </div>
            </div>

            <button type="submit" className="ayur-gradient-submit-btn" style={{ marginTop: '20px' }} disabled={loading}>
              {loading ? 'පිවිසෙමින්…' : <>ඇතුළු වන්න/ Login <span className="btn-arrow">→</span></>}
            </button>

            <p className="form-redirect-footer">
              තවමත් ගිණුමක් නොමැතිද?{' '}
              <span onClick={() => navigate('/register')}>මෙහිදී ලියාපදිංචි වන්න</span>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}