import React from 'react';
import PerformanceChart from './PerformanceChart';
import { getExamTypeLabel } from '../utils/excelParser';

/**
 * Maps every possible subject name (full name, abbreviation, or variant)
 * to a canonical short code. Add more aliases here as needed.
 */
const SUBJECT_ALIAS_MAP = {
  // English
  'ENGLISH': 'ENG', 'ENG': 'ENG',
  // Physics
  'PHYSICS': 'PHY', 'PHY': 'PHY',
  // Chemistry
  'CHEMISTRY': 'CHE', 'CHE': 'CHE', 'CHEM': 'CHE',
  // Mathematics
  'MATHEMATICS': 'MATHS', 'MATHS': 'MATHS', 'MATH': 'MATHS', 'MAT': 'MATHS',
  // Biology
  'BIOLOGY': 'BIO', 'BIO': 'BIO',
  // Computer Science
  'COMPUTER SCIENCE': 'CS', 'CS': 'CS', 'COMP SCI': 'CS', 'COMPSCI': 'CS',
  'COMPUTER': 'CS', 'COMP': 'CS',
};

/**
 * Returns the canonical short code for a subject name, or the original
 * uppercased name if no alias is found.
 */
function canonicalSubject(name) {
  const upper = name.toString().trim().toUpperCase();
  return SUBJECT_ALIAS_MAP[upper] || upper;
}

/**
 * Subject groups for higher classes (11A, 12A, etc.) where students
 * choose only 5 subjects. Each group uses canonical short codes.
 */
const SUBJECT_GROUPS = [
  ['ENG', 'PHY', 'CHE', 'MATHS', 'BIO'],     // Group 1: Eng, Phy, Che, Maths, Bio
  ['ENG', 'PHY', 'CHE', 'MATHS', 'CS'],      // Group 2: Eng, Phy, Che, Maths, CS
  ['ENG', 'PHY', 'CHE', 'CS', 'BIO'],        // Group 3: Eng, Phy, Che, CS, Bio
];

/**
 * Detects which subject group a student belongs to.
 *
 * All subject names are first normalised to canonical codes (e.g.
 * "ENGLISH" → "ENG", "BIOLOGY" → "BIO") before comparison, so the
 * detection works regardless of whether the Excel sheet uses full names
 * or abbreviations.
 *
 * Strategy:
 *  1. Normalise every subject in the class to its canonical code.
 *  2. If the class only has 5 subjects and they match a known group → done.
 *  3. For 6-subject classes, find the group with the most overlap with the
 *     subjects the student actually has marks in (best-match, tolerates one
 *     fully-absent subject — requires ≥4/5 overlap).
 *  4. If no good match → return null (show all subjects as-is).
 *
 * Returns the matched SUBJECT_GROUP array (canonical codes), or null.
 */
function detectStudentSubjectGroup(allSubjects, studentMarks, exams) {
  // Canonical set of all subjects in the class sheet
  const canonicalAll = allSubjects.map(canonicalSubject);
  const canonicalAllSet = new Set(canonicalAll);

  // Build a map from canonical code → original subject name in the sheet
  // so we can return the original names for display purposes
  const canonicalToOriginal = {};
  allSubjects.forEach(sub => {
    canonicalToOriginal[canonicalSubject(sub)] = sub;
  });

  // Step 1 – If the sheet only has 5 subjects, check for a direct group match
  if (allSubjects.length === 5) {
    const sortedCanon = [...canonicalAll].sort();
    const directMatch = SUBJECT_GROUPS.find(g =>
      g.length === sortedCanon.length && g.every((s, i) => s === sortedCanon[i])
    );
    if (directMatch) {
      // Return original names in group order
      return directMatch.map(code => canonicalToOriginal[code] || code);
    }
    return null;
  }

  // Step 2 – Class has more than 5 subjects. Find active subjects (those with
  // at least one non-null mark for this student).
  const activeCanonical = new Set();
  allSubjects.forEach(sub => {
    const code = canonicalSubject(sub);
    for (const examName of Object.keys(exams)) {
      const val = studentMarks[examName] ? studentMarks[examName][sub] : null;
      if (val !== null && val !== undefined) {
        activeCanonical.add(code);
        break;
      }
    }
  });

  // Step 3 – Find best-matching group (highest overlap, all group subjects
  // must be present in the class sheet, need ≥4/5 overlap).
  let bestGroup = null;
  let bestOverlap = 0;

  for (const group of SUBJECT_GROUPS) {
    if (!group.every(s => canonicalAllSet.has(s))) continue;
    const overlap = group.filter(s => activeCanonical.has(s)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestGroup = group;
    }
  }

  if (bestOverlap >= 4 && bestGroup) {
    // Return original names from the sheet in group order
    return bestGroup.map(code => canonicalToOriginal[code] || code);
  }

  return null;
}

/**
 * Calculates sum, max possible, and percentage for an exam column,
 * skipping empty or '-' subjects and evaluating numeric and AB marks.
 */
function calculateColumnStats(subjects, examMeta, studentMarks) {
  let obtainedSum = 0;
  let maxPossibleSum = 0;
  let presentCount = 0;
  let absentCount = 0;

  subjects.forEach(sub => {
    const val = studentMarks[sub];
    const maxMark = examMeta?.subjects[sub] || 100;

    if (typeof val === 'number') {
      obtainedSum += val;
      maxPossibleSum += maxMark;
      presentCount++;
    } else if (val === 'AB') {
      maxPossibleSum += maxMark;
      absentCount++;
    }
    // '-' or empty or 'OD' is skipped: do not calculate empty space for total
  });

  const percentage = maxPossibleSum > 0 ? (obtainedSum / maxPossibleSum) * 100 : null;

  return { obtainedSum, maxPossibleSum, percentage, presentCount, absentCount };
}

/**
 * Calculates average obtained and average max for a subject across selected exams,
 * skipping empty or '-' exams.
 */
function calculateSubjectAverage(examsMeta, selectedExams, sub, studentMarks) {
  let obtainedSum = 0;
  let maxPossibleSum = 0;
  let presentCount = 0;

  selectedExams.forEach(examName => {
    const val = studentMarks[examName] ? studentMarks[examName][sub] : '-';
    const maxMark = examsMeta[examName]?.subjects[sub] || 100;

    if (typeof val === 'number') {
      obtainedSum += val;
      maxPossibleSum += maxMark;
      presentCount++;
    } else if (val === 'AB') {
      maxPossibleSum += maxMark;
      presentCount++;
    }
    // '-' or empty is skipped: do not calculate empty space in average
  });

  const avgObtained = presentCount > 0 ? obtainedSum / presentCount : null;
  const avgMax = presentCount > 0 ? maxPossibleSum / presentCount : null;

  return { avgObtained, avgMax, presentCount };
}

/**
 * Returns the CSS class for a mark cell based on pass/fail/absent/excellent/empty status.
 */
function getMarkCellClass(obtained, maxMark) {
  if (obtained === null || obtained === undefined || obtained === '-' || obtained === '' || obtained === 'NA') return 'empty-cell';
  if (obtained === 'AB') return 'absent-cell';
  if (obtained === 'OD') return 'od-cell';
  if (typeof obtained === 'number') {
    const passmark = maxMark * 0.4;
    if (obtained < passmark) return 'fail-cell';
    if (maxMark > 0 && (obtained / maxMark) >= 0.9) return 'excellent-cell';
  }
  return '';
}

/**
 * Returns the CSS class for an average cell.
 */
function getAverageCellClass(avg, avgMax) {
  if (avg === null || avg === undefined || avg === '-') return 'average-cell empty-cell';
  const passmark = avgMax * 0.4;
  if (avg < passmark) return 'average-cell fail-avg';
  if (avgMax > 0 && (avg / avgMax) >= 0.9) return 'average-cell excellent-avg';
  return 'average-cell';
}

function is12NeetOrJee(className) {
  const normalized = className.replace(/\s+/g, '').toLowerCase();
  return normalized.includes('12neet') || normalized.includes('12jee');
}

/**
 * Returns the subset of exams to use for average calculation.
 * In CUSTOM mode, filters to only exams that belong to this section;
 * falls back to all section exams when no match.
 */
function getAvgExamsForSection(sectionSelectedExams, avgExamMode, selectedAvgExams) {
  if (avgExamMode === 'CUSTOM' && selectedAvgExams && selectedAvgExams.length > 0) {
    const filtered = selectedAvgExams.filter(e => sectionSelectedExams.includes(e));
    return filtered.length > 0 ? filtered : sectionSelectedExams;
  }
  return sectionSelectedExams;
}

function buildExamRows(subjects, exams, selectedExams, studentMarks, averageExams) {
  const effAvgExams = (averageExams && averageExams.length > 0) ? averageExams : selectedExams;
  return subjects.map(sub => {
    const examMarks = {};
    selectedExams.forEach(examName => {
      examMarks[examName] = studentMarks[examName] ? studentMarks[examName][sub] : null;
    });
    const avgStats = calculateSubjectAverage(exams, effAvgExams, sub, studentMarks);
    return { subject: sub, marks: examMarks, average: avgStats.avgObtained, avgMax: avgStats.avgMax };
  });
}

function buildColStats(subjects, exams, selectedExams, studentMarks) {
  const colStats = {};
  selectedExams.forEach(examName => {
    const examMeta = exams[examName];
    const studentMarksForExam = {};
    subjects.forEach(sub => {
      studentMarksForExam[sub] = studentMarks[examName] ? studentMarks[examName][sub] : null;
    });
    colStats[examName] = calculateColumnStats(subjects, examMeta, studentMarksForExam);
  });
  return colStats;
}

function calcTotalAverages(rows, includeInAverage = true) {
  let totalObtained = 0;
  let totalMax = 0;
  rows.forEach(row => {
    if (row.average !== null && includeInAverage) {
      totalObtained += row.average;
      totalMax += row.avgMax;
    }
  });
  return { totalObtained, totalMax };
}

function getExamPrefixInfo(examName) {
  const upper = (examName || '').toString().toUpperCase().replace(/\./g, '').trim();
  if (upper.startsWith('RT') || upper.includes('REVISION')) {
    return { key: 'RT', title: 'Revision Test Report', titleClass: 'rt-title' };
  }
  if (upper.startsWith('CT') || upper.includes('CYCLE')) {
    return { key: 'CT', title: 'Cycle Test Report', titleClass: 'ct-title' };
  }
  if (upper.startsWith('UT') || upper.includes('UNIT')) {
    return { key: 'UT', title: 'Unit Test Report', titleClass: 'ut-title' };
  }
  if (upper.startsWith('PT') || upper.includes('PERIODIC')) {
    return { key: 'PT', title: 'Periodic Test Report', titleClass: 'pt-title' };
  }
  if (upper.startsWith('CPT') || upper.includes('CHAPTER')) {
    return { key: 'CPT', title: 'Chapterwise Test Report', titleClass: 'cpt-title' };
  }
  if (upper.startsWith('SPT') || upper.includes('SUBJECT')) {
    return { key: 'SPT', title: 'Subjectwise Test Report', titleClass: 'spt-title' };
  }
  if (upper.startsWith('WPT') || upper.startsWith('WT') || upper.includes('WEEKLY')) {
    return { key: 'WT', title: 'Weekly Test Report', titleClass: 'wt-title' };
  }
  if (upper.startsWith('MT') || upper.includes('MONTHLY') || upper.includes('MIDTERM') || upper.includes('TERM')) {
    return { key: 'MT', title: 'Monthly Test Report', titleClass: 'mt-title' };
  }
  const match = upper.match(/^([A-Z\s]+?)(?:[-_\d]|$)/);
  if (match && match[1].trim().length >= 2) {
    const rawPrefix = match[1].trim();
    return { key: rawPrefix, title: `${rawPrefix} Test Report`, titleClass: 'ot-title' };
  }
  return { key: 'OTHER', title: 'Test Report', titleClass: 'ot-title' };
}

function groupExamsByPrefix(examList) {
  const groups = [];
  const map = new Map();
  (examList || []).forEach(exam => {
    const info = getExamPrefixInfo(exam);
    if (!map.has(info.key)) {
      const g = { key: info.key, title: info.title, titleClass: info.titleClass, exams: [] };
      map.set(info.key, g);
      groups.push(g);
    }
    map.get(info.key).exams.push(exam);
  });
  return groups;
}

function ExamTableSection({ title, titleClass, selectedExams, rows, colStats, totalAvg, totalAvgMax, maxPerSubject, passMark, exams, subjects, totalMax, showMaxColumn, hideMeta, showAverage = true, avgExams = [] }) {
  const formatMark = (val) => {
    if (val === null || val === undefined || val === '-' || val === '' || val === 'NA' || val === 'N/A') return '-';
    if (val === 'AB') return 'AB';
    if (val === 'OD') return 'OD';
    if (typeof val === 'number') return Math.round(val);
    return val;
  };
  const formatPercentage = (val) => (val === null || val === undefined ? "-" : `${Math.round(val)}%`);
  const maxSum = totalMax || (subjects.length * maxPerSubject);

  // Compute average column totals directly from rows (bypasses showExamsWithoutAveraging=false giving 0)
  const validAvgRows = rows.filter(r => typeof r.average === 'number');
  const avgColObtained = validAvgRows.reduce((sum, row) => sum + (row.average ?? 0), 0);
  const avgColMax = validAvgRows.reduce((sum, row) => sum + (row.avgMax ?? 0), 0);
  const avgColPercentage = avgColMax > 0 ? (avgColObtained / avgColMax) * 100 : null;

  // Re-order avgExams to match the left-to-right column order (selectedExams order)
  const orderedAvgExams = selectedExams.filter(e => (avgExams || []).includes(e));

  const averageLabel = (() => {
    if (!orderedAvgExams || orderedAvgExams.length === 0) return 'Average';
    if (orderedAvgExams.length === 1) return `Average (${orderedAvgExams[0]})`;
    return `Average (${orderedAvgExams[0]} ~ ${orderedAvgExams[orderedAvgExams.length - 1]})`;
  })();

  return (
    <div className="report-section">
      <h3 className={`report-section-title ${titleClass}`}>{title}</h3>
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              <th>Subject</th>
              {showMaxColumn && <th>Max</th>}
              {selectedExams.map(exam => <th key={exam}>{exam}</th>)}
              {showAverage && <th className="average-hdr" style={{ fontSize: '11px' }}>{averageLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.subject}>
                <td className="subject-name-cell">{row.subject}</td>
                {showMaxColumn && <td className="max-mark-cell">{exams[selectedExams[0]]?.subjects[row.subject] || maxPerSubject}</td>}
                {selectedExams.map(exam => {
                  const m = row.marks[exam];
                  const maxMark = exams[exam]?.subjects[row.subject] || maxPerSubject;
                  return (
                    <td key={exam} className={getMarkCellClass(m, maxMark)}>
                      {formatMark(m)}
                    </td>
                  );
                })}
                {showAverage && (
                  <td className={getAverageCellClass(row.average, row.avgMax)}>
                    {typeof row.average === 'number' ? Math.round(row.average) : (row.average === 'AB' ? 'AB' : '-')}
                  </td>
                )}
              </tr>
            ))}

            <tr className="summary-row">
              <td className="subject-name-cell">Total ({maxSum})</td>
              {showMaxColumn && <td className="max-mark-cell">{maxSum}</td>}
              {selectedExams.map(exam => {
                const stats = colStats[exam];
                const displayVal = (stats && (stats.presentCount > 0 || stats.absentCount > 0)) ? stats.obtainedSum : '-';
                return <td key={exam}>{displayVal}</td>;
              })}
              {showAverage && (
                <td className="average-cell">
                  {avgColMax > 0 ? `${Math.round(avgColObtained)} / ${Math.round(avgColMax)}` : (validAvgRows.length > 0 ? Math.round(avgColObtained) : '-')}
                </td>
              )}
            </tr>

            <tr className="summary-row">
              <td className="subject-name-cell">Percentage</td>
              {showMaxColumn && <td />}
              {selectedExams.map(exam => (
                <td key={exam}>{formatPercentage(colStats[exam]?.percentage)}</td>
              ))}
              {showAverage && <td className="average-cell">{formatPercentage(avgColPercentage)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mark-legend">
        <span className="legend-items">
          <span><span className="legend-dot absent-dot" /> AB / NA</span>
          <span><span className="legend-dot fail-dot" /> Below Pass Mark</span>
          <span><span className="legend-dot excellent-dot" /> ≥ 90 %</span>
        </span>
        <span className="legend-marks-info">
          Total Mark: {maxPerSubject} &nbsp;|&nbsp; Pass Mark: {Math.round(maxPerSubject * 0.4)}
        </span>
      </div>
    </div>
  );
}

export default function ReportCard({
  student,
  classData,
  selectedWts = [],
  selectedMts = [],
  selectedCpts = [],
  selectedSpts = [],
  selectedOthers = [],
  selectedExamsByType = null,
  graphExamType = 'AUTO',
  selectedGraphExams = [],
  avgExamMode = 'AUTO',
  selectedAvgExams = [],
  sectionOrder = ['WT', 'MT', 'CPT', 'SPT', 'OTHER'],
  logoUrl,
  schoolName = "Nava Bharath National School",
  academicYear = "2026-27",
  reportDate = new Date().toLocaleDateString('en-GB'),
  showExamsWithoutAveraging = false
}) {
  const { className, subjects: allSubjects, exams } = classData;

  const is12neetjee = is12NeetOrJee(className);
  const normalizedName = className.replace(/\s+/g, '').toLowerCase();
  const isNeet = normalizedName.includes('11neet') || normalizedName.includes('12neet');
  const isTargetClass = isNeet || normalizedName.includes('11jee') || normalizedName.includes('12jee');
  const is11NeetOrJee = normalizedName.includes('11neet') || normalizedName.includes('11jee');
  const showMax = isNeet || normalizedName.includes('12jee');

  // Detect student's subject group (for 5-subject grouped classes)
  const studentGroup = detectStudentSubjectGroup(allSubjects, student.marks, exams);
  
  // Filter student's active subjects: only keep subjects where student has numeric marks, AB, or OD
  const studentActiveSubjects = allSubjects.filter(sub => {
    return Object.keys(exams).some(examName => {
      const val = student.marks[examName]?.[sub];
      return typeof val === 'number' || val === 'AB' || val === 'OD';
    });
  });
  const subjects = (studentActiveSubjects.length >= 3 && studentActiveSubjects.length <= 5)
    ? studentActiveSubjects
    : (studentGroup || (allSubjects.length > 5 ? allSubjects.slice(0, 5) : allSubjects));

  // --- Show/hide average column ---
  const showAvgColumn = avgExamMode !== 'NONE';

  // Helper to retrieve selected exams for any type
  const getExamsForType = (typeKey) => {
    if (selectedExamsByType && selectedExamsByType[typeKey] !== undefined) {
      return selectedExamsByType[typeKey] || [];
    }
    if (typeKey === 'WT') return selectedWts || [];
    if (typeKey === 'MT') return selectedMts || [];
    if (typeKey === 'CPT') return selectedCpts || [];
    if (typeKey === 'SPT') return selectedSpts || [];
    if (typeKey === 'OTHER') return selectedOthers || [];
    return [];
  };

  // --- DETERMINE PERFORMANCE GRAPH DATA ---
  let graphExams = [];
  let graphTitle = 'Subject-Wise Mark Analysis';

  if (graphExamType === 'NONE') {
    graphExams = [];
  } else if (graphExamType === 'CUSTOM') {
    graphExams = (selectedGraphExams || []).filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis';
  } else if (graphExamType !== 'AUTO') {
    const list = getExamsForType(graphExamType);
    graphExams = list.filter(e => exams[e]);
    const labelInfo = getExamTypeLabel(graphExamType);
    graphTitle = `Subject-Wise Mark Analysis (${labelInfo.label || graphExamType})`;
  } else {
    // AUTO: pick from sectionOrder (first section that has selected exams)
    let chosenType = null;
    let chosenExams = [];
    for (const sec of sectionOrder) {
      const list = getExamsForType(sec);
      if (list && list.length > 0) {
        chosenType = sec;
        chosenExams = list.filter(e => exams[e]);
        break;
      }
    }
    if (chosenExams.length > 0) {
      graphExams = chosenExams;
      const labelInfo = getExamTypeLabel(chosenType);
      graphTitle = `Subject-Wise Mark Analysis (${labelInfo.label || chosenType})`;
    } else {
      graphExams = [];
    }
  }

  return (
    <div className="report-card">

      {/* ── TOP COLOUR BAND ── */}
      <div className="report-top-band" />

      {/* ── SCHOOL HEADER ── */}
      <div className="report-header">
        <div className="school-logo-container">
          <div className="school-logo-inner-frame">
            {logoUrl ? (
              <img src={logoUrl} alt="School Logo" className="school-logo" />
            ) : (
              <div className="default-logo-placeholder">🏫</div>
            )}
          </div>
        </div>

        <div className="school-info">
          <h2>{schoolName}</h2>
          <p className="report-subtitle">
            Academic Progress &amp; Performance Report <span className="subtitle-pipe">|</span> <span className="subtitle-year">{academicYear}</span>
          </p>
          <p className="report-date">Report Generated Date: {reportDate}</p>
        </div>
      </div>

      {/* ── STUDENT BIO ── */}
      <div className="report-bio">
        <div className="bio-item">
          <span className="bio-label">STUDENT NAME:</span>
          <span className="bio-value">{student.name}</span>
        </div>
        <div className="bio-item">
          <span className="bio-label">CLASS:</span>
          <span className="bio-value">{className}</span>
        </div>
      </div>

      {/* ── TEST REPORT TABLES (Ordered by sectionOrder) ── */}
      {sectionOrder.map(secKey => {
        const secExams = getExamsForType(secKey);
        if (!secExams || secExams.length === 0) return null;

        const secAvgExams = getAvgExamsForSection(secExams, avgExamMode, selectedAvgExams);
        const secRows = buildExamRows(subjects, exams, secExams, student.marks, secAvgExams);
        const secColStats = buildColStats(subjects, exams, secExams, student.marks);
        const secAvg = calcTotalAverages(secRows, showExamsWithoutAveraging);

        const firstExamMeta = exams[secExams[0]];
        let secTotalMax;
        if (isNeet && (secKey === 'WT' || secKey === 'CPT' || secKey === 'RT')) {
          const sumSubjectMax = subjects.reduce((sum, sub) => sum + (firstExamMeta?.subjects[sub] || 0), 0);
          secTotalMax = sumSubjectMax > 0 ? sumSubjectMax : 720;
        } else if (isNeet) {
          const sumSubjectMax = subjects.reduce((sum, sub) => sum + (firstExamMeta?.subjects[sub] || 0), 0);
          secTotalMax = sumSubjectMax > 0 ? sumSubjectMax : 300;
        } else {
          // Standard classes: Total is 500 (or 125 for 25-mark WT, 250 for 50-mark MT)
          const sampleMax = subjects.length > 0 ? (firstExamMeta?.subjects[subjects[0]] || (secKey === 'WT' ? 25 : (secKey === 'MT' ? 50 : 100))) : 100;
          if (sampleMax === 25) secTotalMax = 125;
          else if (sampleMax === 50) secTotalMax = 250;
          else secTotalMax = 500;
        }

        const secMaxPerSubject = Math.round(secTotalMax / subjects.length);
        const secPassMark = Math.round(secMaxPerSubject * 0.4);
        const typeInfo = getExamTypeLabel(secKey);
        const showMaxCol = showMax || (firstExamMeta && subjects.some(s => firstExamMeta.subjects[s] !== firstExamMeta.subjects[subjects[0]]));

        return (
          <ExamTableSection
            key={secKey}
            title={typeInfo.reportTitle}
            titleClass={typeInfo.badgeClass}
            selectedExams={secExams}
            rows={secRows}
            colStats={secColStats}
            totalAvg={secAvg.totalObtained}
            totalAvgMax={secAvg.totalMax}
            maxPerSubject={secMaxPerSubject}
            passMark={secPassMark}
            exams={exams}
            subjects={subjects}
            totalMax={secTotalMax}
            showMaxColumn={showMaxCol}
            hideMeta={isTargetClass}
            showAverage={showAvgColumn}
            avgExams={secAvgExams}
          />
        );
      })}

      {/* ── MARK LEGEND (shown when any mark table is visible) ── */}


      {/* ── PERFORMANCE GRAPH ── */}
      {graphExams.length > 0 && (
        <div className="report-section graph-section">
          <h3 className="report-section-title graph-title">{graphTitle}</h3>
          <div className="report-graph-container">
            <PerformanceChart
              student={student}
              subjects={subjects}
              selectedExams={graphExams}
              classExams={exams}
            />
          </div>
        </div>
      )}

      {/* ── FOOTER SIGNATURES ── */}
      <div className="report-footer">
        <div className="signature-box">Class Teacher</div>
        <div className="signature-box">Principal</div>
        <div className="signature-box">Parents</div>
      </div>

      {/* ── BOTTOM COLOUR BAND ── */}
      <div className="report-bottom-band" />
    </div>
  );
}

const formatMark = (val) => {
  if (val === null || val === undefined || val === '-' || val === '' || val === 'NA' || val === 'N/A') return '-';
  if (val === 'AB') return 'AB';
  if (val === 'OD') return 'OD';
  if (typeof val === 'number') return Math.round(val);
  return val;
};
const formatPercentage = (val) => (val === null || val === undefined ? "-" : `${Math.round(val)}%`);
