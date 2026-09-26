import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

// src/assets/ ෆෝල්ඩරයෙන් නිවැරදිව ගොනු ලබා ගැනීම
import bgFlowers from '../assets/bg-flowers.jpg';
import portraitImg from '../assets/welcome-portrait.jpeg';
import logoAyurveda from '../assets/logo-ayurveda-dept.png';
import logoEmblem from '../assets/logo-sri-lanka-emblem.png';

const WELCOME_DELAY_MS = 1500;   // පසුබිම සහ ලාංඡන දර්ශනය වී තත්පර 1.5 කින් මාතෘකා පෙන්වයි
const BUTTONS_DELAY_MS = 1000;   // ඉන් තත්පර 1 කට පසුව මැද පින්තූරය සහ බොත්තම් පෙන්වයි

export default function Welcome() {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(true);
    }, WELCOME_DELAY_MS);

    const buttonsTimer = setTimeout(() => {
      setShowButtons(true);
    }, WELCOME_DELAY_MS + BUTTONS_DELAY_MS);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(buttonsTimer);
    };
  }, []);

  return (
    <div
      className="welcome-wrapper"
      style={{ backgroundImage: `url(${bgFlowers})` }}
    >
      <div className="welcome-overlay"></div>

      {/* ලාංඡන පෙළගැස්ම (Logos Bar) */}
      <div className="welcome-logo-bar">
        <div className="welcome-logo">
          <svg className="logo-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="#4a6b2f" strokeWidth="1.6">
            <path d="M12 21c0-6 3-9 7-11-1 6-3 9-7 11Z" />
            <path d="M12 21c0-6-3-9-7-11 1 6 3 9 7 11Z" />
          </svg>
          <img
            src={logoAyurveda}
            alt="Department of Ayurveda"
            className="welcome-logo-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="welcome-logo">
          <svg className="logo-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="#4a6b2f" strokeWidth="1.6">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l3 2" strokeLinecap="round" />
          </svg>
          <img
            src={logoEmblem}
            alt="Sri Lanka National Emblem"
            className="welcome-logo-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* මාතෘකා කොටස */}
      {showWelcome && (
        <div className="welcome-heading">
          <h1 className="welcome-title">ආයුබෝවන්!</h1>
          <div className="welcome-subtitle-wrapper">
            <p className="welcome-subtitle">ජාතික ආයුර්වේද ඖෂධ තොග හා රෝගී සත්කාර කළමනාකරණ පද්ධතිය</p>
            <p className="welcome-subtitle-eng">Integrated Ayurvedic Medicinal Inventory and Clinical Record Management System</p>
          </div>
        </div>
      )}

      {/* මැද ඇති රවුම් Frame එක සහ බොත්තම් */}
      <div className="portrait-frame">
        <svg className="portrait-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.4">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.5-4 4-6 7.5-6s6 2 7.5 6" strokeLinecap="round" />
        </svg>
        <img
          src={portraitImg}
          alt=""
          className="portrait-img"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        {/* බොත්තම් දර්ශනය වීම සහ පිටු අතර මාරුවීම (Navigation) */}
        {showButtons && (
          <div className="welcome-buttons">
            <button
              className="welcome-btn"
              onClick={() => navigate('/register')}
            >
              ලියාපදිංචි වන්න
              (Register)
            </button>
            <button
              className="welcome-btn"
              onClick={() => navigate('/login')}
            >
              ඇතුළු වන්න
              (Login)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}