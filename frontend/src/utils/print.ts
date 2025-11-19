/**
 * Print utility functions for generating printable reports
 */

export const printPage = (title: string = 'Report') => {
  window.print();
};

export const printElement = (elementId: string, title: string = 'Report') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              font-size: 12pt;
              color: #000;
              background: #fff;
            }
            .no-print {
              display: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .page-break {
              page-break-after: always;
            }
          }
          body {
            margin: 0;
            padding: 20px;
          }
          h1 {
            font-size: 24pt;
            margin-bottom: 10px;
          }
          h2 {
            font-size: 18pt;
            margin-top: 20px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export const generatePrintContent = (data: any[], columns: { key: string; label: string }[], title: string) => {
  const tableRows = data.map((row) => {
    const cells = columns.map((col) => `<td>${row[col.key] || '-'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const tableHeaders = columns.map((col) => `<th>${col.label}</th>`).join('');

  return `
    <div id="print-content">
      <h1>${title}</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
};

