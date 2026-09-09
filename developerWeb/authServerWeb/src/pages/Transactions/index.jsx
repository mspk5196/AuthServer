import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Receipt, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Printer, 
  Download, 
  RefreshCw, 
  Search,
  ExternalLink 
} from 'lucide-react';
import transactionService from '../../services/transactionService';
import paymentService from '../../services/paymentService';
import Modal from '../../components/Modal';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [checkingOrderId, setCheckingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await transactionService.getTransactions();
      setTransactions(response.data?.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = useCallback(async (receiptId) => {
    if (!receiptId) return;
    try {
      setReceiptLoading(true);
      const response = await transactionService.getReceipt(receiptId);
      setReceipt(response.data?.receipt || null);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      alert('Could not load receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
    }
  }, []);

  const handleCheckStatus = async (orderId) => {
    if (!orderId) return;
    try {
      setCheckingOrderId(orderId);
      const res = await paymentService.checkOrderStatus(orderId);
      if (res.status === 'paid' || res.data?.status === 'paid') {
        alert('Payment confirmed and receipt generated successfully!');
      } else if (res.status === 'failed' || res.data?.status === 'failed') {
        alert('Payment failed or was cancelled on Razorpay.');
      } else {
        alert('Payment is still pending on Razorpay.');
      }
      fetchTransactions();
    } catch (err) {
      console.error('Status check error:', err);
      alert('Could not verify status with payment gateway. Please try again.');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const handlePrintReceipt = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt?.receipt_number || ''}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            td:first-child { font-weight: 600; width: 40%; background: #f9fafb; color: #4b5563; }
            h2 { color: #4f46e5; margin: 0 0 8px 0; }
            .receipt-logo { height: 48px; margin-bottom: 16px; }
            .receipt-footer { margin-top: 32px; font-size: 12px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('receipt-print-area');
    if (!el) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = 40;
      const y = 40;
      const scale = imgHeight > pageHeight - 80 ? (pageHeight - 80) / imgHeight : 1;
      pdf.addImage(imgData, 'PNG', x, y, imgWidth * scale, imgHeight * scale);
      pdf.save(`Receipt-${receipt?.receipt_number || 'download'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Could not generate PDF. Please try the Print option instead.');
    } finally {
      setPdfLoading(false);
    }
  };

  const fmt = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';

  const fmtDateTime = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const fmtAmount = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const typeLabel = (t) =>
    ({ initial_purchase: 'New Purchase', renewal: 'Renewal', upgrade: 'Upgrade' }[t] || t || '—');

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (tx.plan_name && tx.plan_name.toLowerCase().includes(term)) ||
      (tx.receipt_number && tx.receipt_number.toLowerCase().includes(term)) ||
      (tx.order_id && tx.order_id.toLowerCase().includes(term)) ||
      (tx.status && tx.status.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-8 h-8 text-indigo-600" />
            Transactions
          </h1>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            View your complete payment history, active invoices, and generated receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all shadow-xs font-medium"
            />
          </div>
          <button
            onClick={fetchTransactions}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 font-medium">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-medium">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchTerm ? 'No matching transactions' : 'No transactions yet'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {searchTerm
                ? 'Try adjusting your search keywords to find specific transaction records.'
                : 'When you purchase or renew a subscription tier, your payment invoices will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Date &amp; Time</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Receipt</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredTransactions.map((tx) => {
                  const isPaid = tx.status === 'paid';
                  const isPending = tx.status === 'created';
                  const isFailed = tx.status === 'failed';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-medium">
                        {fmtDateTime(tx.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{tx.plan_name}</div>
                        {tx.duration_label && (
                          <span className="text-xs text-slate-500 font-medium">{tx.duration_label}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md font-semibold text-slate-700">
                          {typeLabel(tx.payment_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-black text-slate-900 text-base">
                        {fmtAmount(tx.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Paid
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                        {!isPaid && !isPending && !isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {tx.receipt_number ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                            {tx.receipt_number}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {tx.receipt_id ? (
                          <button
                            onClick={() => handleViewReceipt(tx.receipt_id)}
                            disabled={receiptLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            {receiptLoading ? 'Loading...' : 'View Receipt'}
                          </button>
                        ) : tx.status === 'created' ? (
                          <button
                            onClick={() => handleCheckStatus(tx.order_id)}
                            disabled={checkingOrderId === tx.order_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                checkingOrderId === tx.order_id ? 'animate-spin' : ''
                              }`}
                            />
                            {checkingOrderId === tx.order_id ? 'Checking...' : 'Check Status'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <Modal onClose={() => setReceipt(null)}>
          <div className="p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
            {/* Modal Actions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Payment Receipt</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Invoice #{receipt.receipt_number}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Download className={`w-3.5 h-3.5 ${pdfLoading ? 'animate-bounce' : ''}`} />
                  {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>

            {/* Printable Receipt Area */}
            <div
              id="receipt-print-area"
              className="bg-white text-slate-900 p-8 rounded-xl font-sans border border-slate-200"
            >
              <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
                <div>
                  <img src="/logo.png" alt="MSPK™ Apps" className="h-10 w-10 mb-2 rounded-full object-contain" />
                  <p className="text-xs text-slate-500 font-semibold">MSPK™ Apps Authentication Platform</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs uppercase tracking-wider rounded-full">
                    PAID
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-2">#{receipt.receipt_number}</p>
                  <p className="text-xs text-slate-500">{fmtDateTime(receipt.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 text-xs text-slate-600">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Billed To</p>
                  <p className="font-bold text-slate-900 text-sm">{receipt.developer_name}</p>
                  <p>{receipt.developer_email}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Details</p>
                  <p><span className="font-semibold text-slate-700">Method:</span> {receipt.payment_method || 'Razorpay'}</p>
                  <p><span className="font-semibold text-slate-700">Order ID:</span> {receipt.order_id}</p>
                  {receipt.payment_id && (
                    <p><span className="font-semibold text-slate-700">Payment ID:</span> {receipt.payment_id}</p>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Validity</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {receipt.plan_name} {receipt.duration_label ? `(${receipt.duration_label})` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{typeLabel(receipt.payment_type)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {fmt(receipt.plan_start_date)} to {fmt(receipt.plan_end_date) || 'No Expiry'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {fmtAmount(receipt.amount)} {receipt.currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-slate-500 font-medium">Thank you for developing with MSPK™ Apps.</p>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold mr-3">Total Amount Paid:</span>
                  <span className="text-lg font-black text-slate-900">
                    {fmtAmount(receipt.amount)} {receipt.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceipt(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Transactions;
