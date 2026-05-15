import { api } from '../utils/api';

const transactionService = {
  /**
   * Get all transactions for the authenticated developer.
   */
  getTransactions: () => api.get('/developer/transactions'),

  /**
   * Get a specific receipt by its UUID.
   * @param {string} receiptId
   */
  getReceipt: (receiptId) => api.get(`/developer/transactions/${receiptId}/receipt`),
};

export default transactionService;
