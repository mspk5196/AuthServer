import { Link } from 'react-router-dom';
import './Home.scss';

const Home = () => {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Authentication Platform for Developers</h1>
            <p className="hero-subtitle">
              Complete authentication solution for your apps. Manage users, enable Google Sign-In,
              and integrate authentication in minutes.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Secure Authentication</h3>
              <p>
                Industry-standard security with bcrypt password hashing, JWT tokens,
                and email verification.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Quick Integration</h3>
              <p>
                Get your unique API key and base URL. Integrate authentication into
                your app in minutes.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Google Sign-In</h3>
              <p>
                Enable Google OAuth with your credentials. Let users sign in with
                their Google accounts.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>User Management</h3>
              <p>
                View all users, check verification status, and manage user access
                from one dashboard.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📧</div>
              <h3>Email Verification</h3>
              <p>
                Automated email verification and password reset flows using Brevo SMTP.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Account Linking</h3>
              <p>
                Seamlessly merge email and Google accounts. Users can sign in with either method.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Account</h3>
              <p>Sign up as a developer and verify your email address.</p>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <h3>Register Your App</h3>
              <p>Create an app and get your unique API key and base URL.</p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Integrate & Launch</h3>
              <p>Use our API endpoints to add authentication to your application.</p>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <h3>Manage Users</h3>
              <p>Monitor and manage all users from your developer dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join developers building secure authentication for their apps.</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
