import * as XLSX from 'xlsx';

/**
 * Classifies an exam name into a type (WT/MT/CPT/SPT/OTHER) so the UI can group
 * exams into sections. The original on-sheet name is preserved as-is for display;
 * it is never rewritten (e.g. 'WT-I' stays 'WT-I', 'T 1' stays 'T 1').
 */
export function normalizeExamName(name) {
  if (!name) return null;
  const original = name.toString().trim();
  const upper = original.toUpperCase();
  // Remove dots so dotted abbreviations like "M.T.", "W.T.", "C.P.T." are recognised
  const upperNoDots = upper.replace(/\./g, '');
  
  let type = null;
  if (upperNoDots.includes('WPT') || upperNoDots.includes('WT') || upperNoDots.includes('WEEKLY')) {
    type = 'WT';
  } else if (
    upperNoDots.includes('MT') || 
    upperNoDots.includes('MONTHLY') || 
    upperNoDots.includes('MIDTERM') || 
    upperNoDots.includes('MID TERM') || 
    upperNoDots.includes('MID') || 
    upperNoDots.includes('TERMINAL') || 
    upperNoDots.includes('HALF YEARLY') ||
    upperNoDots.includes('QUARTERLY') ||
    upperNoDots.includes('ANNUAL')
  ) {
    type = 'MT';
  } else if (upperNoDots.includes('CPT') || upperNoDots.includes('CHAPTER')) {
    type = 'CPT';
  } else if (upperNoDots.includes('SPT') || upperNoDots.includes('SUBJECT')) {
    type = 'SPT';
  } else if (upperNoDots.includes('RT') || upperNoDots.includes('REVISION')) {
    type = 'RT';
  } else if (upperNoDots.includes('CT') || upperNoDots.includes('CYCLE')) {
    type = 'CT';
  } else if (upperNoDots.includes('UT') || upperNoDots.includes('UNIT')) {
    type = 'UT';
  } else if (upperNoDots.includes('PT') || upperNoDots.includes('PERIODIC')) {
    type = 'PT';
  } else if (upperNoDots.includes('TERM')) {
    type = 'MT';
  } else {
    const prefixMatch = upperNoDots.match(/^([A-Z]+)/);
    if (prefixMatch && prefixMatch[1].length >= 2) {
      type = prefixMatch[1];
    } else {
      type = 'OTHER';
    }
  }
  
  // Extract number or Roman numeral — work on the dot-free version
  const clean = upperNoDots
    .replace('WEEKLY TEST', '')
    .replace('MONTHLY TEST', '')
    .replace('MID TERM TEST', '')
    .replace('MIDTERM TEST', '')
    .replace('REVISION TEST', '')
    .replace('CYCLE TEST', '')
    .replace('UNIT TEST', '')
    .replace('PERIODIC TEST', '')
    .replace('WEEKLY', '')
    .replace('MONTHLY', '')
    .replace('MID TERM', '')
    .replace('MIDTERM', '')
    .replace('MID', '')
    .replace('HALF YEARLY', '')
    .replace('TERMINAL', '')
    .replace('QUARTERLY', '')
    .replace('ANNUAL', '')
    .replace('REVISION', '')
    .replace('CYCLE', '')
    .replace('UNIT', '')
    .replace('PERIODIC', '')
    .replace('WPT', '')
    .replace('WT', '')
    .replace('MT', '')
    .replace('CPT', '')
    .replace('SPT', '')
    .replace('RT', '')
    .replace('CT', '')
    .replace('UT', '')
    .replace('PT', '')
    .replace('CHAPTER', '')
    .replace('SUBJECT', '')
    .replace('TEST', '')
    .replace('TERM', '')
    .replace(/[-_ ]/g, ''); // Remove spaces, hyphens, underscores
    
  let num = null;
  if (clean === 'IX') num = 9;
  else if (clean === 'VIII') num = 8;
  else if (clean === 'VII') num = 7;
  else if (clean === 'VI') num = 6;
  else if (clean === 'V') num = 5;
  else if (clean === 'IV') num = 4;
  else if (clean === 'III' || clean === '3') num = 3;
  else if (clean === 'II' || clean === '2') num = 2;
  else if (clean === 'I' || clean === '1') num = 1;
  else {
    const match = clean.match(/\d+/);
    if (match) {
      num = parseInt(match[0], 10);
    }
  }
  
  if (num !== null) {
    return { type, name: original, number: num };
  }
  
  if (type === 'OTHER') return { type, name: original, number: 0 };
  return { type, name: original, number: 1 };
}

/**
 * Returns human-readable label and report title info for an exam type.
 */
export function getExamTypeLabel(type) {
  switch (type) {
    case 'WT': return { label: 'Weekly Tests', tableTitle: 'Weekly Tests Table', reportTitle: 'Weekly Test Report', badgeClass: 'wt-title' };
    case 'MT': return { label: 'Monthly Tests', tableTitle: 'Monthly Tests Table', reportTitle: 'Monthly Test Report', badgeClass: 'mt-title' };
    case 'CPT': return { label: 'Chapterwise Tests', tableTitle: 'Chapterwise Tests Table', reportTitle: 'Chapterwise Test Report', badgeClass: 'cpt-title' };
    case 'SPT': return { label: 'Subjectwise Tests', tableTitle: 'Subjectwise Tests Table', reportTitle: 'Subjectwise Test Report', badgeClass: 'spt-title' };
    case 'RT': return { label: 'Revision Tests', tableTitle: 'Revision Tests Table', reportTitle: 'Revision Test Report', badgeClass: 'rt-title' };
    case 'CT': return { label: 'Cycle Tests', tableTitle: 'Cycle Tests Table', reportTitle: 'Cycle Test Report', badgeClass: 'ct-title' };
    case 'UT': return { label: 'Unit Tests', tableTitle: 'Unit Tests Table', reportTitle: 'Unit Test Report', badgeClass: 'ut-title' };
    case 'PT': return { label: 'Periodic Tests', tableTitle: 'Periodic Tests Table', reportTitle: 'Periodic Test Report', badgeClass: 'pt-title' };
    default: return { 
      label: type === 'OTHER' ? 'Tests' : `${type} Tests`, 
      tableTitle: type === 'OTHER' ? 'Tests Table' : `${type} Tests Table`, 
      reportTitle: type === 'OTHER' ? 'Test Report' : `${type} Test Report`, 
      badgeClass: 'ot-title' 
    };
  }
}

/**
 * Parses raw mark cell value.
 * Converts 'AB', 'NA', '-', empty strings, or nulls to null (indicates absent).
 * Parses valid numbers to float.
 */
function parseMarkValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if (val.v !== undefined) val = val.v;
    else if (val.w !== undefined) val = val.w;
    else return null;
  }
  if (val === null || val === undefined) return null;
  
  const str = val.toString().replace(/\u00a0/g, ' ').trim().toUpperCase();
  if (
    str === 'AB' || 
    str === 'NA' || 
    str === '-' || 
    str === '' || 
    str === 'ABSENT' || 
    str === 'N/A' || 
    str === 'A.B' || 
    str === 'A.B.'
  ) {
    return null;
  }
  
  const cleanStr = str.replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
}

const NON_SUBJECT_KEYWORDS = [
  'TOTAL', 'GRAND TOTAL', 'GT', 'PERCENTAGE', 'PERCENT', '%', 
  'RANK', 'REMARKS', 'ATTENDANCE', 'AVERAGE', 'AVG', 'RESULT', 
  'STATUS', 'S.NO', 'SNO', 'ROLL', 'NAME', 'MAX'
];

/**
 * Locates the header layout of a grade sheet by searching the top rows for a
 * "MAX" marker. The exam-name row is typically 2 rows above the MAX row and the
 * subject row 1 row above, so the marker position is used to derive them all.
 * This makes parsing robust when sheets don't have "MAX" in exactly cell B3
 * (e.g. sheets with extra/merged header rows like "12 CA CMA").
 * Returns null if no MAX marker is found.
 */
function findHeaderRows(rows) {
  const scanRows = Math.min(rows.length, 15);
  for (let r = 0; r < scanRows; r++) {
    const row = rows[r];
    if (!row) continue;
    const scanCols = Math.min(row.length, 12);
    for (let c = 0; c < scanCols; c++) {
      const cell = row[c];
      if (cell === null || cell === undefined) continue;
      const str = String(cell).replace(/\u00a0/g, ' ').trim().toUpperCase();
      const clean = str.replace(/[.\s]+/g, '');
      if (clean === 'MAX' || clean.startsWith('MAX')) {
        if (r >= 2) {
          return { examRow: r - 2, subjectRow: r - 1, maxRow: r };
        }
      }
    }
  }
  return null;
}

/**
 * Main parser function to process the Excel workbook.
 */
export function parseExcelWorkbook(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array', cellFormulas: true, cellHTML: false });
  const ignoreSheets = ['temp', 'STAFF_ALLOCATION'];
  
  const parsedData = {
    classes: {}
  };
  
  for (const sheetName of workbook.SheetNames) {
    if (ignoreSheets.includes(sheetName)) continue;
    
    const ws = workbook.Sheets[sheetName];
    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    
    // We need at least 3 rows: Exam Names (1), Subject Names (2), Max Marks (3)
    if (rows.length < 3) continue;
    
    // Locate the header layout. Prefer the row that contains a "MAX" marker, but
    // fall back to the standard layout (rows 0/1/2) when no marker is present so
    // that class sheets with slightly different layouts still get parsed.
    let header = findHeaderRows(rows);
    if (!header) {
      header = { examRow: 0, subjectRow: 1, maxRow: 2 };
    }
    
    const row1 = rows[header.examRow] || []; // Exam Names
    const row2 = rows[header.subjectRow] || []; // Subject Names
    const row3 = rows[header.maxRow] || []; // Max Marks
    
    const className = sheetName.trim();
    const subjectsSet = new Set();
    const exams = {}; // examName -> { type, subjects: { subCode: maxMark } }
    const columnsMeta = []; // index -> { examName, examType, subject } or { isTarget: true, subject }
    const targetMaxMarks = {}; // subjectCode -> maxMark for TGT columns
    let hasTargets = false;
    
    let currentRawExamName = null;
    let currentIsTarget = false;
    
    // Compute scan width from the widest header row so we don't miss
    // trailing MT/WT columns that appear beyond the subject row's length.
    const headerColCount = Math.max(row1.length || 0, row2.length || 0, row3.length || 0);

    // Process headers starting from column C (index 2)
    for (let c = 2; c < headerColCount; c++) {
      const examCellVal = row1[c];
      const subjectCellVal = row2[c];
      const maxMarkCellVal = row3[c];
      
      if (examCellVal !== null && examCellVal !== undefined && examCellVal.toString().trim() !== '') {
        const examStr = examCellVal.toString().trim().toUpperCase();
        const examStrClean = examStr.replace(/[.\s]+/g, '');
        // Detect TGT / TARGET column group
        if (examStrClean === 'TGT' || examStrClean === 'TARGET') {
          currentRawExamName = null;
          currentIsTarget = true;
        } else {
          currentIsTarget = false;
          // Reset currentRawExamName if column header is a summary column like TOTAL / GRAND TOTAL
          const isSummaryCol = NON_SUBJECT_KEYWORDS.some(k => examStr.includes(k));
          if (isSummaryCol) {
            currentRawExamName = null;
          } else {
            currentRawExamName = examCellVal.toString().trim();
          }
        }
      }
      
      const subjectCode = subjectCellVal ? subjectCellVal.toString().trim().toUpperCase() : null;
      const isNonSubject = subjectCode && NON_SUBJECT_KEYWORDS.some(k => subjectCode === k || subjectCode.includes(k));
      
      // Handle TGT columns
      if (currentIsTarget && subjectCode && !isNonSubject) {
        subjectsSet.add(subjectCode);
        const maxMarkVal = maxMarkCellVal !== null ? parseFloat(maxMarkCellVal) : 100;
        targetMaxMarks[subjectCode] = isNaN(maxMarkVal) ? 100 : maxMarkVal;
        hasTargets = true;
        columnsMeta[c] = {
          isTarget: true,
          subject: subjectCode
        };
      } else if (currentRawExamName && subjectCode && !isNonSubject) {
        const norm = normalizeExamName(currentRawExamName);
        if (norm) {
          subjectsSet.add(subjectCode);
          
          if (!exams[norm.name]) {
            exams[norm.name] = {
              name: norm.name,
              type: norm.type, // 'WT', 'MT', 'CPT', 'SPT', or 'OTHER'
              number: norm.number,
              subjects: {}
            };
          }
          
          const maxMarkVal = maxMarkCellVal !== null ? parseFloat(maxMarkCellVal) : 100;
          exams[norm.name].subjects[subjectCode] = isNaN(maxMarkVal) ? 100 : maxMarkVal;
          
          columnsMeta[c] = {
            examName: norm.name,
            examType: norm.type,
            subject: subjectCode
          };
        } else {
          columnsMeta[c] = null;
        }
      } else {
        columnsMeta[c] = null;
      }
    }
    
    // Only register the sheet as a class if at least one exam column was recognised
    if (subjectsSet.size === 0) continue;

    const subjects = Array.from(subjectsSet);
    const students = [];
    
    // Process student rows starting from the first data row after headers
    const dataStartRow = header.maxRow + 1;
    for (let r = dataStartRow; r < rows.length; r++) {
      const studentRow = rows[r];
      if (!studentRow) continue;
      
      const studentName = studentRow[1] ? studentRow[1].toString().trim() : null;
      // Skip if name is empty or is literally "MAX"
      if (!studentName || studentName.toUpperCase() === 'MAX') continue;
      
      const marks = {}; // examName -> { subCode: value }
      const targets = {}; // subCode -> target value (for TGT columns)
      
      // Initialize marks structure
      Object.keys(exams).forEach(examName => {
        marks[examName] = {};
      });
      
      // Read marks from columns — use headerColCount so we don't stop
      // short when a student row is narrower than the header rows.
      for (let c = 2; c < headerColCount; c++) {
        const meta = columnsMeta[c];
        if (meta) {
          const cellVal = c < studentRow.length ? studentRow[c] : null;
          const val = parseMarkValue(cellVal);
          
          if (meta.isTarget) {
            // Store target marks separately
            if (val !== null) {
              targets[meta.subject] = val;
            } else if (targets[meta.subject] === undefined) {
              targets[meta.subject] = null;
            }
          } else {
            const existingVal = marks[meta.examName][meta.subject];
            // Never overwrite an existing valid numeric mark with null!
            if (val !== null) {
              marks[meta.examName][meta.subject] = val;
            } else if (existingVal === undefined) {
              marks[meta.examName][meta.subject] = null;
            }
          }
        }
      }
      
      const studentObj = {
        sno: studentRow[0] ? parseFloat(studentRow[0]) : students.length + 1,
        name: studentName,
        marks
      };
      if (hasTargets) {
        studentObj.targets = targets;
      }
      students.push(studentObj);
    }
    
    // Sort exams by type and number for consistent UI presentation
    const typeOrder = { WT: 0, MT: 1, CPT: 2, SPT: 3, OTHER: 4 };
    const sortedExams = Object.values(exams).sort((a, b) => {
      if (a.type !== b.type) {
        return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      }
      return a.number - b.number;
    });
    
    const classObj = {
      className,
      subjects,
      exams: sortedExams.reduce((acc, exam) => {
        acc[exam.name] = exam;
        return acc;
      }, {}),
      students: students.sort((a, b) => a.name.localeCompare(b.name))
    };
    if (hasTargets) {
      classObj.hasTargets = true;
      classObj.targetMaxMarks = targetMaxMarks;
    }
    parsedData.classes[className] = classObj;
  }
  
  return parsedData;
}
