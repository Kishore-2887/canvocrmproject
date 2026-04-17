const fs       = require('fs');
const readline = require('readline');

const REQUIRED_FIELDS = ['name', 'email', 'source', 'date', 'location', 'language'];

/**
 * Parse a CSV file using Node.js built-in `fs` and `readline` modules.
 * No external CSV libraries used.
 *
 * CSV Format (first row = headers):
 *   name, email, source, date, location, language
 *
 * @param {string} filePath - Absolute path to the uploaded CSV file
 * @returns {Promise<{ leads: Object[], errors: string[] }>}
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const leads  = [];
    const errors = [];
    let headers  = null;
    let rowIndex = 0;

    const rl = readline.createInterface({
      input:     fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (rawLine) => {
      const line = rawLine.trim();
      if (!line) return; // skip blank lines

      const cells = parseCSVLine(line);

      // First non-empty line = header row
      if (!headers) {
        headers = cells.map((h) => h.trim().toLowerCase());
        return;
      }

      rowIndex++;

      // Map cells to header keys
      const row = {};
      headers.forEach((key, i) => {
        row[key] = (cells[i] || '').trim();
      });

      // Validate required fields
      const missing = REQUIRED_FIELDS.filter((f) => !row[f]);
      if (missing.length > 0) {
        errors.push(`Row ${rowIndex + 1}: Missing required field(s): ${missing.join(', ')}`);
        return;
      }

      // Validate date if provided
      if (row['date'] && isNaN(new Date(row['date']).getTime())) {
        errors.push(`Row ${rowIndex + 1}: Invalid date format "${row['date']}"`);
        return;
      }

      leads.push({
        name:     row['name'],
        email:    row['email']       || undefined,
        phoneNumber: row['phone']    || row['phonenumber'] || undefined,
        source:   row['source']      || undefined,
        location: row['location']    || undefined,
        language: row['language'],
        date:     row['date'] ? new Date(row['date']) : new Date(),
      });
    });

    rl.on('close', () => {
      // Clean up the uploaded file after parsing
      fs.unlink(filePath, () => {});
      resolve({ leads, errors });
    });

    rl.on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
};

/**
 * Parse a single CSV line, respecting quoted fields that may contain commas.
 * Handles:
 *   - Simple:  John,Smith,john@example.com
 *   - Quoted:  "Smith, Jr.",john@example.com
 *
 * @param {string} line - Raw CSV line
 * @returns {string[]} Array of cell values
 */
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Handle escaped quotes: two consecutive ""
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  cells.push(current); // last field
  return cells;
}

module.exports = { parseCSV };
