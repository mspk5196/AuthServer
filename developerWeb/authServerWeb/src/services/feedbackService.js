import { api, API_BASE_URL } from '../utils/api';

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

  /**
   * Fetch developer's submitted feedbacks & tickets list.
   */
  getList: () => api.get('/developer/feedback/list'),

  /**
   * Fetch a single feedback thread with all messages.
   */
  getThread: (id) => api.get(`/developer/feedback/${id}/thread`),

  /**
   * Developer replies to an existing feedback thread.
   */
  reply: (id, payload) => api.post(`/developer/feedback/${id}/reply`, payload),

  /**
   * Download attachment from initial submission.
   */
  downloadAttachment: async (id, idx = 0, filename = 'attachment') => {
    const res = await fetch(`${API_BASE_URL}/developer/feedback/${id}/attachment/${idx}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Attachment not found');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download attachment from a thread message.
   */
  downloadMessageAttachment: async (messageId, filename = 'attachment') => {
    const res = await fetch(`${API_BASE_URL}/developer/feedback/message/${messageId}/attachment`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Message attachment not found');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default feedbackService;
