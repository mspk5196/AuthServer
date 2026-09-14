import { api } from '../utils/api';

const usageService = {
  getHistory: (params = {}) => {
    const query = new URLSearchParams();
    if (params.groupBy)    query.set('groupBy', params.groupBy);
    if (params.startDate)  query.set('startDate', params.startDate);
    if (params.endDate)    query.set('endDate', params.endDate);
    if (params.appId)      query.set('appId', params.appId);
    if (params.groupId)    query.set('groupId', params.groupId);
    return api.get(`/developer/usage/history?${query.toString()}`);
  },

  getApps: () => api.get('/developer/usage/apps'),

  getGroups: () => api.get('/developer/usage/groups'),
};

export default usageService;
