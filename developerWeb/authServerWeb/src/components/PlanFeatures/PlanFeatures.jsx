import PropTypes from 'prop-types';

const getFeatureSentences = (features) => {
  if (!features) return [];

  const sentences = [];

  if (typeof features.max_apps === 'number') {
    sentences.push(`Up to ${features.max_apps} apps`);
  }

  if (typeof features.max_api_calls === 'number') {
    const formattedCalls = features.max_api_calls.toLocaleString();
    sentences.push(`Up to ${formattedCalls} API calls per month`);
  }

  if (features.google_login) {
    sentences.push('Google login supported');
  }

  if (features.support) {
    const support = String(features.support).toLowerCase();
    if (support === 'email') {
      sentences.push('Email support');
    } else if (support === 'chat') {
      sentences.push('Chat support');
    } else {
      sentences.push(`${features.support} support`);
    }
  }

  return sentences;
};

const PlanFeatures = ({
  features,
  showTitle = false,
  title = 'Features',
  wrapperClassName,
  listClassName = 'feature-list',
}) => {
  const featureSentences = getFeatureSentences(features);

  if (!featureSentences.length) return null;

  // If no wrapper or title is requested, just render the list
  if (!showTitle && !wrapperClassName) {
    return (
      <ul className={listClassName}>
        {featureSentences.map((feature, idx) => (
          <li key={idx}>{feature}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className={wrapperClassName}>
      {showTitle && <h4>{title}</h4>}
      <ul className={listClassName}>
        {featureSentences.map((feature, idx) => (
          <li key={idx}>{feature}</li>
        ))}
      </ul>
    </div>
  );
};

PlanFeatures.propTypes = {
  features: PropTypes.object,
  showTitle: PropTypes.bool,
  title: PropTypes.string,
  wrapperClassName: PropTypes.string,
  listClassName: PropTypes.string,
};

export default PlanFeatures;
