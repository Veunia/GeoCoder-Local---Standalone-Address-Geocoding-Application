import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

export class CSVHandler {
  static async readCSV(csvContent) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
        .on('data', (data) => {
          if (this.validateRow(data)) {
            results.push(data);
          }
        })
        .on('error', (error) => reject(new Error(`CSV parsing error: ${error.message}`)))
        .on('end', () => resolve(results));
    });
  }

  static validateRow(row) {
    return row && 
           row.address && 
           typeof row.address === 'string' && 
           row.address.trim().length > 0;
  }

  static exportResults(data, fields) {
    try {
      return stringify(data, {
        header: true,
        columns: fields
      });
    } catch (error) {
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  }
}
