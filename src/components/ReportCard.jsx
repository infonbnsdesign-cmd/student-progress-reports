import React from 'react';
import PerformanceChart from './PerformanceChart';

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
 * skipping subjects where the student was absent (null).
 */
function calculateColumnStats(subjects, examMeta, studentMarks) {
  let obtainedSum = 0;
  let maxPossibleSum = 0;
  let presentCount = 0;
  let absentCount = 0;

  subjects.forEach(sub => {
    const obtained = studentMarks[sub];
    const maxMark = examMeta.subjects[sub] || 100;

    if (obtained !== null && obtained !== undefined) {
      obtainedSum += obtained;
      maxPossibleSum += maxMark;
      presentCount++;
    } else {
      absentCount++;
    }
  });

  const percentage = maxPossibleSum > 0 ? (obtainedSum / maxPossibleSum) * 100 : null;

  return { obtainedSum, maxPossibleSum, percentage, presentCount, absentCount };
}

/**
 * Calculates average obtained and average max for a subject across selected exams,
 * skipping exams where the student was absent.
 */
function calculateSubjectAverage(examsMeta, selectedExams, sub, studentMarks) {
  let obtainedSum = 0;
  let maxPossibleSum = 0;
  let presentCount = 0;

  selectedExams.forEach(examName => {
    const obtained = studentMarks[examName] ? studentMarks[examName][sub] : null;
    const maxMark = examsMeta[examName]?.subjects[sub] || 100;

    if (obtained !== null && obtained !== undefined) {
      obtainedSum += obtained;
      maxPossibleSum += maxMark;
      presentCount++;
    }
  });

  const avgObtained = presentCount > 0 ? obtainedSum / presentCount : null;
  const avgMax = presentCount > 0 ? maxPossibleSum / presentCount : null;

  return { avgObtained, avgMax, presentCount };
}

/**
 * Returns the CSS class for a mark cell based on pass/fail/absent/excellent status.
 * - null/undefined → 'absent-cell' (dark blue)
 * - obtained < passmark → 'fail-cell' (red)
 * - obtained/max >= 0.9 → 'excellent-cell' (green)
 * - else → '' (normal)
 */
function getMarkCellClass(obtained, maxMark) {
  if (obtained === null || obtained === undefined) return 'absent-cell';
  const passmark = maxMark * 0.4; // 40% of max (WT: 25→10, MT: 50→20)
  if (obtained < passmark) return 'fail-cell';
  if (maxMark > 0 && (obtained / maxMark) >= 0.9) return 'excellent-cell';
  return '';
}

/**
 * Returns the CSS class for an average cell.
 */
function getAverageCellClass(avg, avgMax) {
  if (avg === null || avg === undefined) return 'average-cell';
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

function ExamTableSection({ title, titleClass, selectedExams, rows, colStats, totalAvg, totalAvgMax, maxPerSubject, passMark, exams, subjects, totalMax, showMaxColumn, hideMeta, showAverage = true, avgExams = [] }) {
  const formatMark = (val) => (val === null || val === undefined ? "AB" : Math.round(val));
  const formatPercentage = (val) => (val === null || val === undefined ? "-" : `${Math.round(val)}%`);
  const maxSum = totalMax || (subjects.length * maxPerSubject);

  // Compute average column totals directly from rows (bypasses showExamsWithoutAveraging=false giving 0)
  const avgColObtained = rows.reduce((sum, row) => sum + (row.average ?? 0), 0);
  const avgColMax = rows.reduce((sum, row) => sum + (row.avgMax ?? 0), 0);
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
                    {row.average !== null ? Math.round(row.average) : 'AB'}
                  </td>
                )}
              </tr>
            ))}

            <tr className="summary-row">
              <td className="subject-name-cell">Total ({maxSum})</td>
              {showMaxColumn && <td className="max-mark-cell">{maxSum}</td>}
              {selectedExams.map(exam => (
                <td key={exam}>{colStats[exam].obtainedSum}</td>
              ))}
              {showAverage && (
                <td className="average-cell">
                  {avgColMax > 0 ? `${Math.round(avgColObtained)} / ${Math.round(avgColMax)}` : Math.round(avgColObtained)}
                </td>
              )}
            </tr>

            <tr className="summary-row">
              <td className="subject-name-cell">Percentage</td>
              {showMaxColumn && <td />}
              {selectedExams.map(exam => (
                <td key={exam}>{formatPercentage(colStats[exam].percentage)}</td>
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
  selectedWts,
  selectedMts,
  selectedCpts,
  selectedSpts,
  selectedOthers,
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
  const subjects = studentGroup || allSubjects;

  // --- Show/hide average column ---
  const showAvgColumn = avgExamMode !== 'NONE';

  // --- WT CALCULATIONS ---
  const wtAvgExams = getAvgExamsForSection(selectedWts, avgExamMode, selectedAvgExams);
  const wtRows = buildExamRows(subjects, exams, selectedWts, student.marks, wtAvgExams);
  const wtColStats = buildColStats(subjects, exams, selectedWts, student.marks);
  const wtAvg = calcTotalAverages(wtRows, showExamsWithoutAveraging);
  const wtTotalMax = isNeet ? 720 : (selectedWts.length > 0 ? subjects.reduce((sum, sub) => sum + (exams[selectedWts[0]]?.subjects[sub] || 25), 0) : 25 * subjects.length);
  const wtMaxPerSubject = Math.round(wtTotalMax / subjects.length);
  const wtPassMark = Math.round(wtMaxPerSubject * 0.4);

  let cptRows, cptColStats, cptAvg, cptTotalMax, cptMaxPerSubject, cptPassMark, cptAvgExams;
  let sptRows, sptColStats, sptAvg, sptMaxPerSubject, sptPassMark, sptAvgExams;
  let mtRows, mtColStats, mtAvg, mtMaxPerSubject, mtPassMark, mtAvgExams;

  if (is12neetjee) {
    // --- CPT CALCULATIONS ---
    cptAvgExams = getAvgExamsForSection(selectedCpts, avgExamMode, selectedAvgExams);
    cptRows = buildExamRows(subjects, exams, selectedCpts, student.marks, cptAvgExams);
    cptColStats = buildColStats(subjects, exams, selectedCpts, student.marks);
    cptAvg = calcTotalAverages(cptRows, showExamsWithoutAveraging);
    cptTotalMax = isNeet ? 720 : (selectedCpts.length > 0 ? subjects.reduce((sum, sub) => sum + (exams[selectedCpts[0]]?.subjects[sub] || 25), 0) : 25 * subjects.length);
    cptMaxPerSubject = Math.round(cptTotalMax / subjects.length);
    cptPassMark = Math.round(cptMaxPerSubject * 0.4);

    // --- SPT CALCULATIONS ---
    sptAvgExams = getAvgExamsForSection(selectedSpts, avgExamMode, selectedAvgExams);
    sptRows = buildExamRows(subjects, exams, selectedSpts, student.marks, sptAvgExams);
    sptColStats = buildColStats(subjects, exams, selectedSpts, student.marks);
    sptAvg = calcTotalAverages(sptRows, showExamsWithoutAveraging);
    sptMaxPerSubject = selectedSpts.length > 0 ? (exams[selectedSpts[0]]?.subjects[subjects[0]] || 50) : 50;
    sptPassMark = Math.round(sptMaxPerSubject * 0.4);
  } else {
    // --- MT CALCULATIONS ---
    mtAvgExams = getAvgExamsForSection(selectedMts, avgExamMode, selectedAvgExams);
    mtRows = buildExamRows(subjects, exams, selectedMts, student.marks, mtAvgExams);
    mtColStats = buildColStats(subjects, exams, selectedMts, student.marks);
    mtAvg = calcTotalAverages(mtRows, showExamsWithoutAveraging);
    mtMaxPerSubject = selectedMts.length > 0 ? (exams[selectedMts[0]]?.subjects[subjects[0]] || 50) : 50;
    mtPassMark = Math.round(mtMaxPerSubject * 0.4);
  }

  // --- OTHER/CUSTOM TEST CALCULATIONS (apply to any class) ---
  const otAvgExams = getAvgExamsForSection(selectedOthers, avgExamMode, selectedAvgExams);
  const otRows = buildExamRows(subjects, exams, selectedOthers, student.marks, otAvgExams);
  const otColStats = buildColStats(subjects, exams, selectedOthers, student.marks);
  const otAvg = calcTotalAverages(otRows, showExamsWithoutAveraging);
  const otTotalMax = selectedOthers.length > 0 ? subjects.reduce((sum, sub) => sum + (exams[selectedOthers[0]]?.subjects[sub] || 100), 0) : 100 * subjects.length;
  const otMaxPerSubject = Math.round(otTotalMax / subjects.length);
  const otPassMark = Math.round(otMaxPerSubject * 0.4);

  // --- DETERMINE PERFORMANCE GRAPH DATA ---
  let graphExams = [];
  let graphTitle = 'Subject-Wise Mark Analysis';

  if (graphExamType === 'SPT') {
    graphExams = selectedSpts.filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis (SPT)';
  } else if (graphExamType === 'CPT') {
    graphExams = selectedCpts.filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis (CPT)';
  } else if (graphExamType === 'WT') {
    graphExams = selectedWts.filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis (WT)';
  } else if (graphExamType === 'MT') {
    graphExams = selectedMts.filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis (MT)';
  } else if (graphExamType === 'OTHER') {
    graphExams = selectedOthers.filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis';
  } else if (graphExamType === 'CUSTOM') {
    graphExams = (selectedGraphExams || []).filter(e => exams[e]);
    graphTitle = 'Subject-Wise Mark Analysis';
  } else if (graphExamType === 'NONE') {
    graphExams = [];
  } else {
    // AUTO selection fallback:
    if (is12neetjee) {
      if (selectedSpts.length > 0) {
        graphExams = selectedSpts.filter(e => exams[e]?.type === 'SPT');
        graphTitle = 'Subject-Wise Mark Analysis (SPT)';
      } else if (selectedCpts.length > 0) {
        graphExams = selectedCpts.filter(e => exams[e]?.type === 'CPT');
        graphTitle = 'Subject-Wise Mark Analysis (CPT)';
      } else if (selectedWts.length > 0) {
        graphExams = selectedWts.filter(e => exams[e]?.type === 'WT');
        graphTitle = 'Subject-Wise Mark Analysis (WT)';
      } else if (selectedOthers.length > 0) {
        graphExams = selectedOthers;
        graphTitle = 'Subject-Wise Mark Analysis';
      }
    } else if (is11NeetOrJee) {
      graphExams = selectedWts.filter(e => exams[e]?.type === 'WT');
      graphTitle = 'Subject-Wise Mark Analysis (WT)';
    } else {
      const mtExams = selectedMts.filter(e => exams[e]?.type === 'MT');
      const wtExams = selectedWts.filter(e => exams[e]?.type === 'WT');
      if (mtExams.length > 0) {
        graphExams = selectedMts;
      } else if (wtExams.length > 0) {
        graphExams = selectedWts;
        graphTitle = 'Subject-Wise Mark Analysis (WT)';
      } else if (selectedOthers.length > 0) {
        graphExams = selectedOthers;
        graphTitle = 'Subject-Wise Mark Analysis';
      }
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
        if (secKey === 'WT' && selectedWts.length > 0) {
          return (
            <ExamTableSection
              key="WT"
              title="Weekly Test Report"
              titleClass="wt-title"
              selectedExams={selectedWts}
              rows={wtRows}
              colStats={wtColStats}
              totalAvg={wtAvg.totalObtained}
              totalAvgMax={wtAvg.totalMax}
              maxPerSubject={wtMaxPerSubject}
              passMark={wtPassMark}
              exams={exams}
              subjects={subjects}
              totalMax={wtTotalMax}
              showMaxColumn={showMax}
              hideMeta={isTargetClass}
              showAverage={showAvgColumn}
              avgExams={wtAvgExams}
            />
          );
        }
        if (secKey === 'CPT' && is12neetjee && selectedCpts.length > 0) {
          return (
            <ExamTableSection
              key="CPT"
              title="Chapterwise Test Report"
              titleClass="cpt-title"
              selectedExams={selectedCpts}
              rows={cptRows}
              colStats={cptColStats}
              totalAvg={cptAvg.totalObtained}
              totalAvgMax={cptAvg.totalMax}
              maxPerSubject={cptMaxPerSubject}
              passMark={cptPassMark}
              exams={exams}
              subjects={subjects}
              totalMax={cptTotalMax}
              showMaxColumn={showMax}
              hideMeta={isTargetClass}
              showAverage={showAvgColumn}
              avgExams={cptAvgExams}
            />
          );
        }
        if (secKey === 'SPT' && is12neetjee && selectedSpts.length > 0) {
          return (
            <ExamTableSection
              key="SPT"
              title="Subjectwise Test Report"
              titleClass="spt-title"
              selectedExams={selectedSpts}
              rows={sptRows}
              colStats={sptColStats}
              totalAvg={sptAvg.totalObtained}
              totalAvgMax={sptAvg.totalMax}
              maxPerSubject={sptMaxPerSubject}
              passMark={sptPassMark}
              exams={exams}
              subjects={subjects}
              showMaxColumn={showMax}
              hideMeta={isTargetClass}
              showAverage={showAvgColumn}
              avgExams={sptAvgExams}
            />
          );
        }
        if (secKey === 'OTHER' && selectedOthers.length > 0) {
          return (
            <ExamTableSection
              key="OTHER"
              title="Test Report"
              titleClass="ot-title"
              selectedExams={selectedOthers}
              rows={otRows}
              colStats={otColStats}
              totalAvg={otAvg.totalObtained}
              totalAvgMax={otAvg.totalMax}
              maxPerSubject={otMaxPerSubject}
              passMark={otPassMark}
              exams={exams}
              subjects={subjects}
              totalMax={otTotalMax}
              showMaxColumn={false}
              showAverage={showAvgColumn}
              avgExams={otAvgExams}
            />
          );
        }
        if (secKey === 'MT' && !is12neetjee && selectedMts.length > 0) {
          return (
            <ExamTableSection
              key="MT"
              title="Monthly Test Report"
              titleClass="mt-title"
              selectedExams={selectedMts}
              rows={mtRows}
              colStats={mtColStats}
              totalAvg={mtAvg.totalObtained}
              totalAvgMax={mtAvg.totalMax}
              maxPerSubject={mtMaxPerSubject}
              passMark={mtPassMark}
              exams={exams}
              subjects={subjects}
              totalMax={subjects.length * mtMaxPerSubject}
              showMaxColumn={false}
              hideMeta={isTargetClass}
              showAverage={showAvgColumn}
              avgExams={mtAvgExams}
            />
          );
        }
        return null;
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

const formatMark = (val) => (val === null || val === undefined ? "AB" : Math.round(val));
const formatPercentage = (val) => (val === null || val === undefined ? "-" : `${Math.round(val)}%`);
