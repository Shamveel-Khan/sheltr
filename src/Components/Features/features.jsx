import { AuthHeader } from '../Common/AuthHeader';

export const FeaturesPage = ({ onLogin, onBack, onAbout }) => {
  return (
    <div className="info-wrap">
      <div className="info-overlay">
        <div className="info-header">
          <AuthHeader
            actionLabel="Login"
            onAction={onLogin}
            links={[
              { label: 'Back', onClick: onBack },
              { label: 'About', onClick: onAbout }
            ]}
          />
          <h1 className="info-header-title">Features</h1>
        </div>

        <main className="info-content">
          <section className="info-hero">
            <p className="info-subtitle">Everything you need to run hostel operations cleanly.</p>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Room Management</h3>
                <p>Track capacity, room types, and availability in seconds.</p>
              </div>
              <div className="feature-card">
                <h3>Student Profiles</h3>
                <p>Maintain student records, departments, and contact details.</p>
              </div>
              <div className="feature-card">
                <h3>Allocations</h3>
                <p>Assign rooms quickly with allocation history and status.</p>
              </div>
              <div className="feature-card">
                <h3>Payments</h3>
                <p>Capture fees, track totals, and visualize revenue trends.</p>
              </div>
              <div className="feature-card">
                <h3>Complaints</h3>
                <p>Monitor issues, track status, and resolve faster.</p>
              </div>
              <div className="feature-card">
                <h3>Visitors Log</h3>
                <p>Record entries and exits with a clear audit trail.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
