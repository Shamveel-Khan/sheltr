import DotGrid from '../Common/DotGrid';
import { AuthHeader } from '../Common/AuthHeader';

export const LandingPage = ({ onLogin, onFeatures, onAbout }) => {
  return (
    <div className="landing-wrap">
      <div className="landing-bg">
        <DotGrid
          dotSize={10}
          gap={13}
          baseColor="#3b3b46"
          activeColor="#f5f6ff"
          proximity={150}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={0.5}
        />
      </div>

      <div className="landing-overlay">
        <div className="landing-header">
          <AuthHeader
            actionLabel="Login"
            onAction={onLogin}
            links={[
              { label: 'Features', onClick: onFeatures },
              { label: 'About', onClick: onAbout }
            ]}
          />
        </div>

        <main className="landing-center">
          <section className="landing-hero">
            <h1 className="landing-title">Organized flow for every hostel move.</h1>
            <p className="landing-subtitle">
              Manage rooms, payments, and allocations with a calm, visual workspace built
              for fast teams.
            </p>
            <div className="landing-cta">
              <button type="button" className="btn landing-cta-primary" onClick={onLogin}>
                Get started
              </button>
              <button type="button" className="btn landing-cta-ghost">
                Learn more
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
