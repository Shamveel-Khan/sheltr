import { AuthHeader } from '../Common/AuthHeader';
import Lanyard from '../Common/Lanyard';
import kabeerImage from '../../assets/lanyard/kabeer.jpg';
import skImage from '../../assets/lanyard/sk.jpg';
import sahilImage from '../../assets/lanyard/sahil.jpg';

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
          <h1 className="info-header-title">About</h1>
        </div>

        <main className="info-content">
          <section className="info-hero">
            <div className="about-grid">
              {[kabeerImage, skImage, sahilImage].map((image, index) => (
                <div key={index} className="about-item">
                  <Lanyard cardImage={image} position={[0, 0, 26]} gravity={[0, -40, 0]} />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
