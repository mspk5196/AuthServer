import './Legal.scss';

const Terms = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <h1>Terms & Conditions</h1>
        <p>
          These terms describe how you may use the MSPK Auth Platform and related services.
          By creating a developer account or using the APIs, you agree to these terms.
        </p>
        <h2>Use of Service</h2>
        <p>
          You are responsible for any applications and users that integrate with this service.
          You must not use the service for unlawful activities or in ways that violate data
          protection laws in your region.
        </p>
        <h2>Payments</h2>
        <p>
          Paid plans are billed through Razorpay. All charges are in INR. You are responsible
          for any applicable taxes and ensuring valid payment details during checkout.
        </p>
        <h2>Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the service after
          changes means you accept the revised terms.
        </p>
      </div>
    </div>
  );
};

export default Terms;
