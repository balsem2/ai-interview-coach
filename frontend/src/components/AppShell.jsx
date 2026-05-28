function Icon({ name }) {
  const icons = {
    sparkle: (
      <>
        <path d="M12 3.5 13.8 10l6.7 2-6.7 2-1.8 6.5-1.8-6.5-6.7-2 6.7-2L12 3.5Z" />
        <path d="m18 3 .6 2.4L21 6l-2.4.6L18 9l-.6-2.4L15 6l2.4-.6L18 3Z" />
      </>
    ),
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />,
    video: (
      <>
        <path d="M4 7h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
        <path d="m15 10 5-3v10l-5-3" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h4" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20h16" />
        <path d="M7 16V8M12 16V5M17 16v-6" />
      </>
    ),
    settings: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c2 2 5 2 7 0" />
      </>
    ),
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    medal: (
      <>
        <path d="M8 3h8l-2 6h-4L8 3Z" />
        <circle cx="12" cy="13" r="4" />
        <path d="M10 17 9 22l3-2 3 2-1-5" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="19" r="2" />
        <path d="m8 11 8-5M8 13l8 5" />
      </>
    ),
    download: (
      <>
        <path d="M12 4v10" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 20h14" />
      </>
    ),
    send: (
      <>
        <path d="M21 3 10 14" />
        <path d="m21 3-7 18-4-7-7-4 18-7Z" />
      </>
    ),
    mic: (
      <>
        <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    play: <path d="m9 6 10 6-10 6V6Z" />,
    arrow: <path d="M4 16 10 10l4 4 6-6M15 8h5v5" />
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function AppShell({ active, onNavigate, children }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "interview", label: "Interview Room", icon: "video" },
    { id: "report", label: "Reports", icon: "file" },
    { id: "analytics", label: "Analytics", icon: "chart" }
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <Icon name="sparkle" />
          </div>
          <div>
            <strong>AI Interview</strong>
            <span>Simulator</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={active === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="side-footer">
          <button className="nav-item" type="button">
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <button className="nav-item" type="button" onClick={() => onNavigate("logout")}>
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export { AppShell, Icon };
