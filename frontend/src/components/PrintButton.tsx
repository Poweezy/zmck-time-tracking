import { printElement } from '../utils/print';

interface PrintButtonProps {
  elementId: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

const PrintButton = ({ elementId, title = 'Report', className = '', children }: PrintButtonProps) => {
  const handlePrint = () => {
    printElement(elementId, title);
  };

  return (
    <button
      onClick={handlePrint}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label="Print"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      {children || <span className="text-sm font-medium">Print</span>}
    </button>
  );
};

export default PrintButton;

