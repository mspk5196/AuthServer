import './Legal.scss';

const Privacy = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p>
          We collect only the minimum information required to operate the MSPK Auth Platform,
          such as your developer account details and basic usage metrics.
        </p>
        <h2>Data We Collect</h2>
        <p>
          This includes your name, username, email address, profile photo (if provided), and
          application identifiers. User data from your applications is processed solely for
          authentication and security purposes.
        </p>
        <h2>Data Sharing</h2>
        <p>
          We do not sell or share your data with any third persons, companies, or organisations
          for marketing or unrelated purposes. We may share limited data with trusted
          infrastructure providers (such as email and payment gateways) strictly to operate
          the service.
        </p>
        <h2>Security</h2>
        <p>
          We apply industry-standard security practices, including encryption in transit
          and restricted access to production systems.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
