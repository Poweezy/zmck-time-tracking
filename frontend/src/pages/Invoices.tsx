import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PrintButton from '../components/PrintButton';
import InvoiceModal from '../components/InvoiceModal';

interface Invoice {
  id: number;
  invoice_number: string;
  project_name: string;
  project_code: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  item_type: string;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: number) => {
    try {
      await api.put(`/invoices/${id}/send`);
      toast.success('Invoice sent');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send invoice');
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await api.put(`/invoices/${id}/mark-paid`);
      toast.success('Invoice marked as paid');
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark invoice as paid');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSkeleton type="table" count={10} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate and manage invoices from time entries and expenses</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          <span>New Invoice</span>
        </button>
      </div>

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchInvoices}
      />

      <div className="bg-white dark:bg-gray-800 shadow-card rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="empty-state">
                    <div className="empty-state-icon text-gray-600 dark:text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="empty-state-title text-gray-900 dark:text-gray-100">No invoices found</div>
                    <div className="empty-state-description text-gray-700 dark:text-gray-400">
                      Create your first invoice from approved time entries and expenses
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{invoice.project_name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{invoice.project_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    E{parseFloat(invoice.total_amount.toString()).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                      >
                        View
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleSend(invoice.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          Send
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => handleMarkPaid(invoice.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          Mark Paid
                        </button>
                      )}
                      <PrintButton elementId={`invoice-${invoice.id}`} title={`Invoice ${invoice.invoice_number}`} className="text-sm" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <div id={`invoice-${selectedInvoice.id}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-card p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedInvoice.invoice_number}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedInvoice.project_name}</p>
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {format(new Date(selectedInvoice.invoice_date), 'MMMM dd, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {format(new Date(selectedInvoice.due_date), 'MMMM dd, yyyy')}
              </p>
            </div>
          </div>

          <table className="w-full mb-6">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Unit Price</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedInvoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">E{item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">E{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Subtotal</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  E{selectedInvoice.subtotal.toFixed(2)}
                </td>
              </tr>
              {selectedInvoice.tax_rate > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Tax ({selectedInvoice.tax_rate}%)
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    E{selectedInvoice.tax_amount.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-lg font-bold text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-4 py-2 text-right text-lg font-bold text-gray-900 dark:text-gray-100">
                  E{selectedInvoice.total_amount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default Invoices;

