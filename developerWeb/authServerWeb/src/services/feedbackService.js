import { api } from '../utils/api';

const feedbackService = {
  /**
   * Submit feedback or an issue.
   * @param {object} payload
   * @param {string}   payload.type         - 'feedback' | 'issue'
   * @param {string}   payload.title        - optional
   * @param {string}   payload.description
   * @param {string}   [payload.app_id]
   * @param {number}   [payload.group_id]
   * @param {Array}    payload.files        - [{ name, mimeType, size, data: base64 }]
   */
  submit: (payload) =>
    api.post('/developer/feedback', payload, { timeout: 60000 }),

  /**
   * Fetch developer's own apps (for the selector).
   */
  getApps: () => api.get('/developer/feedback/apps'),

  /**
   * Fetch developer's own groups (for the selector).
   */
  getGroups: () => api.get('/developer/feedback/groups'),
};

export default feedbackService;
