// Export service for generating formatted Excel files
import * as ExcelJS from 'exceljs';
import type { ReportSummary } from './types';

interface ExcelExportConfig {
  data: any[];
  summary?: ReportSummary;
  reportName?: string;
  columnHeaders?: string[];
}

/**
 * Generate a formatted Excel workbook buffer
 * Includes proper formatting, headers, totals row, and summary statistics
 */
export async function generateExcelReport(config: ExcelExportConfig): Promise<Buffer> {
  const { data, summary, reportName = 'Report' } = config;

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Handle empty data
  if (!data || data.length === 0) {
    worksheet.columns = [{ header: 'No Data', key: 'empty', width: 20 }];
    worksheet.addRow({ empty: 'No records to export' });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Get column keys from first data row
  const columns = Object.keys(data[0]);

  // Set up worksheet columns with proper widths
  const columnConfigs = columns.map((col) => ({
    header: formatHeaderName(col),
    key: col,
    width: calculateColumnWidth(col, data)
  }));

  worksheet.columns = columnConfigs;

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 11
  };
  headerRow.fill = {
    type: 'pattern' as const,
    pattern: 'solid',
    fgColor: { argb: 'FF1F5A96' } // Dark blue
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Apply filters to header row (AutoFilter on entire data range)
  try {
    const lastCol = String.fromCharCode(64 + columns.length);
    (worksheet.autoFilter as any) = `A1:${lastCol}${data.length + 1}`;
  } catch (e) {
    // AutoFilter is optional - continue without it if it fails
  }

  // Add data rows with formatting
  const numericColumns = getNumericColumns(data, columns);
  const dateColumns = getDateColumns(data, columns);

  for (const row of data) {
    const excelRow = worksheet.addRow(row);

    // Format numeric columns
    for (const col of numericColumns) {
      const cell = excelRow.getCell(col);
      if (cell.value !== null && cell.value !== undefined) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }

    // Format date columns
    for (const col of dateColumns) {
      const cell = excelRow.getCell(col);
      if (cell.value) {
        cell.numFmt = 'dd/mm/yyyy';
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // Left align text columns
    for (let i = 1; i <= columns.length; i++) {
      if (!numericColumns.includes(i) && !dateColumns.includes(i)) {
        const cell = excelRow.getCell(i);
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
  }

  // Add summary row if data exists
  if (data.length > 0) {
    const summaryRowNum = worksheet.rowCount + 2;
    const summaryRow = worksheet.getRow(summaryRowNum);

    // Add "TOTAL" label
    summaryRow.getCell(1).value = 'TOTAL';
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).fill = {
      type: 'pattern' as const,
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' } // Light gray
    };

    // Add sum formulas for numeric columns
    for (const colIndex of numericColumns) {
      const colLetter = String.fromCharCode(64 + colIndex);
      const cell = summaryRow.getCell(colIndex);
      cell.value = {
        formula: `SUM(${colLetter}2:${colLetter}${worksheet.rowCount - 2})`
      };
      cell.numFmt = '#,##0.00';
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern' as const,
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' }
      };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // Fill rest of summary row with background
    for (let i = 2; i <= columns.length; i++) {
      if (!numericColumns.includes(i)) {
        const cell = summaryRow.getCell(i);
        cell.fill = {
          type: 'pattern' as const,
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' }
        };
      }
    }
  }

  // Add summary sheet if summary stats provided
  if (summary) {
    const summarySheet = workbook.addWorksheet('Summary');

    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    const summaryHeaderRow = summarySheet.getRow(1);
    summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    summaryHeaderRow.fill = {
      type: 'pattern' as const,
      pattern: 'solid',
      fgColor: { argb: 'FF1F5A96' }
    };

    const summaryData = [
      { metric: 'Total Records', value: summary.totalRecords },
      { metric: 'Total Loan Value', value: summary.totalLoanValue },
      { metric: 'Total Commission', value: summary.totalCommission },
      { metric: 'Approval Rate (%)', value: summary.approvalRate.toFixed(2) },
      { metric: 'Execution Rate (%)', value: summary.executionRate.toFixed(2) }
    ];

    for (const row of summaryData) {
      const excelRow = summarySheet.addRow(row);
      const valueCell = excelRow.getCell('value');

      if (row.metric.includes('Rate')) {
        valueCell.numFmt = '0.00';
      } else if (row.metric !== 'Total Records') {
        valueCell.numFmt = '$#,##0.00';
      }

      excelRow.getCell('metric').font = { bold: true };
      excelRow.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  }

  // Set print options
  worksheet.pageSetup.paperSize = 9; // A4
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.margins = {
    left: 0.5,
    right: 0.5,
    top: 0.75,
    bottom: 0.75,
    header: 0.5,
    footer: 0.5
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Format column header names from snake_case or camelCase to readable format
 */
function formatHeaderName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capitals in camelCase
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

/**
 * Calculate optimal column width based on content
 */
function calculateColumnWidth(colName: string, data: any[]): number {
  let maxLength = formatHeaderName(colName).length + 2; // Header length + padding

  for (const row of data) {
    const value = row[colName];
    const length = String(value || '').length;
    maxLength = Math.max(maxLength, length);
  }

  // Cap maximum width at 50
  return Math.min(maxLength + 2, 50);
}

/**
 * Identify numeric columns for formatting
 */
function getNumericColumns(data: any[], columns: string[]): number[] {
  const numericCols: number[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    let isNumeric = true;

    for (const row of data.slice(0, Math.min(10, data.length))) {
      const value = row[col];
      if (value !== null && value !== undefined && typeof value !== 'number') {
        isNumeric = false;
        break;
      }
    }

    if (isNumeric) {
      numericCols.push(i + 1); // Column indexes are 1-based in ExcelJS
    }
  }

  return numericCols;
}

/**
 * Identify date columns for formatting
 */
function getDateColumns(data: any[], columns: string[]): number[] {
  const dateCols: number[] = [];
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO format
    /_date$|_at$|Date|date/i // Column name contains 'date' or 'at'
  ];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    let isDate = false;

    // Check column name
    if (datePatterns.some((pattern) => pattern.test(col))) {
      isDate = true;
    }

    // Check sample values
    if (!isDate) {
      for (const row of data.slice(0, Math.min(5, data.length))) {
        const value = row[col];
        if (value && typeof value === 'string') {
          if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            isDate = true;
            break;
          }
        }
      }
    }

    if (isDate) {
      dateCols.push(i + 1);
    }
  }

  return dateCols;
}
