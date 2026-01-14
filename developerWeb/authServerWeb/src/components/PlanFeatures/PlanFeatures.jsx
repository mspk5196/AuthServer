import PropTypes from 'prop-types';

export const getFeatureSentences = (features) => {
  if (!features) return [];

  const sentences = [];
  const getNumeric = (value) => {
    if (typeof value === 'number') return value;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  };

  // App limits (support both new and legacy keys). 0 = unlimited.
  const appsLimit = getNumeric(features.max_apps ?? features.apps_limit);
  if (appsLimit !== null) {
    if (appsLimit === 0) {
      sentences.push('Unlimited apps');
    } else {
      sentences.push(`Up to ${appsLimit} apps`);
    }
  }

  // API call limits (support both new and legacy keys). 0 = unlimited.
  const apiCallsLimit = getNumeric(features.max_api_calls ?? features.api_calls_limit);
  if (apiCallsLimit !== null) {
    if (apiCallsLimit === 0) {
      sentences.push('Unlimited API calls per month');
    } else {
      const formattedCalls = apiCallsLimit.toLocaleString();
      sentences.push(`Up to ${formattedCalls} API calls per month`);
    }
  }

  // Group / standalone app limits
  const maxStandaloneApps = getNumeric(features.max_standalone_apps);
  if (maxStandaloneApps !== null) {
    if (maxStandaloneApps === 0) {
      sentences.push('Unlimited standalone apps');
    } else {
      sentences.push(`Up to ${maxStandaloneApps} standalone apps`);
    }
  }

  const maxAppGroups = getNumeric(features.max_app_groups);
  if (maxAppGroups !== null) {
    if (maxAppGroups === 0) {
      sentences.push('Unlimited app groups');
    } else {
      sentences.push(`Up to ${maxAppGroups} app groups`);
    }
  }

  const maxAppsPerGroup = getNumeric(features.max_apps_per_group);
  if (maxAppsPerGroup !== null) {
    if (maxAppsPerGroup === 0) {
      sentences.push('Unlimited apps per group');
    } else {
      sentences.push(`Up to ${maxAppsPerGroup} apps per group`);
    }
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
