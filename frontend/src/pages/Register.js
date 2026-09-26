import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import './Register.css';

// Images Import Links
import bgFlowers from '../assets/bg-flowers.jpg';
import logoTop from '../assets/logo-top.png';
import ayurvedaImg from '../assets/ayurveda-side.png';
import bottomShape from '../assets/bottom-shape.png';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const form = e.target.elements;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const dob = form.dob.value;
    const gender = form.gender.value;
    const role = form.role.value;

    if (password !== confirmPassword) {
      setError('මුරපද නොගැලපේ.');
      return;
    }
    if (password.length < 6) {
      setError('මුරපදය අකුරු 6ක් හෝ වැඩි විය යුතුයි.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phone,
        dob,
        gender,
        role,
        createdAt: new Date()
      });

      localStorage.setItem('user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        role,
        name
      }));

      if (role === 'doctor') navigate('/doctor');
      else if (role === 'ticket_counter') navigate('/ticket-counter');
else if (role === 'pharmacist' || role === 'staff') navigate('/pharmacy/dashboard');
      else if (role === 'admin') navigate('/admin');

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('මෙම විද්‍යුත් තැපෑල දැනටමත් ලියාපදිංචි කර ඇත.');
      } else if (err.code === 'auth/weak-password') {
        setError('මුරපදය අකුරු 6ක් හෝ වැඩි විය යුතුයි.');
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

          {/* Logo & Brand - Inline Alignment */}
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
              ඖෂධ තොග හා  <br />
              රෝගී සත්කාර කළමනාකරණ පද්ධතිය
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

        {/* ================= RIGHT SIDE: REGISTRATION FORM ================= */}
        <div className="ayur-card-right-white-box">
          <div className="ayur-box-header">
            <h2>ගිණුමක් <span>සාදන්න</span></h2>
            <p>පුද්ගලීකරණය කළ ආයුර්වේද විසඳුම් ලබා ගැනීමට ලියාපදිංචි වන්න</p>
          </div>

          <form className="ayur-white-form" onSubmit={handleRegister}>

            {error && <p className="error-msg" role="alert">{error}</p>}

            {/* Row 1 */}
            <div className="form-row-two-columns">
              <div className="input-group-cell">
                <label>සම්පූර්ණ නම / Full Name</label>
                <div className="input-with-icon">
                  <span className="field-icon">👤</span>
                  <input type="text" name="name" placeholder="රත්නායක" required />
                </div>
              </div>
              <div className="input-group-cell">
                <label>විද්‍යුත් තැපෑල / Email</label>
                <div className="input-with-icon">
                  <span className="field-icon">✉️</span>
                  <input type="email" name="email" placeholder="rathnayaka@gmail.com" required />
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="form-row-two-columns">
              <div className="input-group-cell">
                <label>දුරකථන අංකය / Phone Number</label>
                <div className="input-with-icon">
                  <span className="field-icon">📞</span>
                  <input type="tel" name="phone" placeholder="07xxxxxxx" required />
                </div>
              </div>
              <div className="input-group-cell">
                <label>මුරපදය / Password</label>
                <div className="input-with-icon">
                  <span className="field-icon">🔒</span>
                  <input type="password" name="password" placeholder="මුරපදයක් සාදන්න" required />
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="form-row-two-columns">
              <div className="input-group-cell">
                <label>තහවුරු කරන්න / Confirm Password</label>
                <div className="input-with-icon">
                  <span className="field-icon">🔒</span>
                  <input type="password" name="confirmPassword" placeholder="මුරපදය නැවත ඇතුළත් කරන්න" required />
                </div>
              </div>
              <div className="input-group-cell">
                <label>උපන් දිනය / Date of Birth</label>
                <div className="input-with-icon">
                  <span className="field-icon">📅</span>
                  <input type="date" name="dob" required />
                </div>
              </div>
            </div>

            {/* Row 4 */}
            <div className="form-row-two-columns">
              <div className="input-group-cell">
                <label>ස්ත්‍රී/පුරුෂ භාවය / Gender</label>
                <div className="radio-group">
                  <label><input type="radio" name="gender" value="male" required /> පුරුෂ</label>
                  <label><input type="radio" name="gender" value="female" /> ස්ත්‍රී</label>
                </div>
              </div>
              <div className="input-group-cell">
                <label>භූමිකාව / Role</label>
                <div className="input-with-icon">
                  <span className="field-icon">💼</span>
                  <select name="role" required defaultValue="">
                    <option value="" disabled>භූමිකාව තෝරන්න / Your Role</option>
                    <option value="ticket_counter">ප්‍රවේශපත්‍ර කවුන්ටරය / Ticket Counter</option>
                    <option value="doctor">වෛද්‍යවරයා / Doctor</option>
                    <option value="pharmacist">ඖෂධවේදියා / Pharmacist</option>
                    <option value="admin">පරිපාලක / Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="terms-checkbox-row">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                මම <span>නියමයන් සහ කොන්දේසි</span> මෙන්ම <span>රහස්‍යතා ප්‍රතිපත්තියට</span> එකඟ වෙමි.
              </label>
            </div>

            <button type="submit" className="ayur-gradient-submit-btn" disabled={loading}>
              {loading ? 'ගිණුම සාදමින්…' : <>ගිණුම සාදන්න/ Register <span className="btn-arrow">→</span></>}
            </button>

            <p className="form-redirect-footer">
              දැනටමත් ගිණුමක් ඇත්ද?{' '}
              <span onClick={() => navigate('/login')}>මෙහිදී ඇතුළු වන්න</span>
            </p>

          </form>
        </div>

      </div>
    </div>
  );
}