import React from 'react';
import './RoleTopbar.css';

export default function RoleTopbar({ roleLabel, notificationCount = 0 }) {
  return (
    <header className="role-topbar">
      <div className="role-topbar-welcome">
        <span aria-hidden="true">🍃</span>
        <strong>ඔබට සුභ දවසක්!</strong>
      </div>
      <div className="role-topbar-actions">
        <button type="button" className="role-topbar-notifications" aria-label={`දැනුම්දීම් ${notificationCount}`}>
          <i className="bi bi-bell" aria-hidden="true" />
          {notificationCount > 0 && (
            <span className="role-topbar-badge">{notificationCount}</span>
          )}
        </button>
        <div className="role-topbar-profile">
          <i className="bi bi-person-circle" aria-hidden="true" />
          <span>{roleLabel}</span>
        </div>
      </div>
    </header>
  );
}
