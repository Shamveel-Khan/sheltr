import { AuthHeader } from '../Common/AuthHeader';
import Lanyard from '../Common/Lanyard';

export const AboutPage = ({ onLogin, onBack, onFeatures }) => {
  return (
    <div className="info-wrap">
      <div className="info-overlay">
        <div className="info-header">
          <AuthHeader
            actionLabel="Login"
            onAction={onLogin}
            links={[
              { label: 'Back', onClick: onBack },
              { label: 'Features', onClick: onFeatures }
            ]}
          />
        </div>

        <main className="info-content">
          <section className="info-hero">
            <h1 className="info-title">About</h1>
            <div className="about-grid">
              {['Operations', 'Campus Life', 'Support'].map(label => (
                <div key={label} className="about-item">
                  <Lanyard position={[0, 0, 26]} gravity={[0, -40, 0]} />
                  <div className="about-caption">{label}</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
