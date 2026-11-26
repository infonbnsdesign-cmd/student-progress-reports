import React, { useRef } from 'react';

/**
 * ClassConsolidatedReport — Renders a class-level consolidated marks report
 * in A4 Landscape orientation matching the visual language of the ReportCard.
 * Features: decorative bands, framed logo, school header with subtitle,
 * class+students on the right, and exam-name row in the table.
 */
export default function ClassConsolidatedReport({
  classData,
  selectedExams = [],
  schoolName = "NAVA BHARATH NATIONAL SCHOOL",
  logoUrl,
  academicYear = "2026-27",
}) {
  const reportRef = useRef(null);
  const { className, subjects, students, exams, hasTargets, targetMaxMarks } = classData;

  const reviewLabels = ['R-1', 'R-2', 'R-3', 'R-4', 'R-5', 'R-6'];
  const activeExams = selectedExams.filter(e => exams[e]);

  const showTgt = hasTargets;
  const subColCount = (showTgt ? 1 : 0) + activeExams.length;
  const totalSubjectSpan = (subjects.length + 1) * (subColCount || 1);

  const getMaxMark = (examName, sub) => exams[examName]?.subjects[sub] || 100;

  const getSubjectMax = (sub) => {
    if (activeExams.length > 0) return getMaxMark(activeExams[0], sub);
    if (showTgt && targetMaxMarks) return targetMaxMarks[sub] || 100;
    return 100;
  };

  const targetTotalMax = subjects.reduce((sum, sub) =>
    sum + (targetMaxMarks?.[sub] || getSubjectMax(sub)), 0);

  const fmt = (val) => {
    if (val === null || val === undefined) return 'AB';
    if (typeof val === 'number') return Math.round(val);
    return val;
  };

  const calcStudentExamTotal = (student, examName) => {
    let total = 0; let hasAny = false;
    subjects.forEach(sub => {
      const val = student.marks[examName]?.[sub];
      if (val !== null && val !== undefined && typeof val === 'number') { total += val; hasAny = true; }
    });
    return hasAny ? total : null;
  };

  const calcStudentTgtTotal = (student) => {
    if (!student.targets) return null;
    let total = 0; let hasAny = false;
    subjects.forEach(sub => {
      const val = student.targets[sub];
      if (val !== null && val !== undefined && typeof val === 'number') { total += val; hasAny = true; }
    });
    return hasAny ? total : null;
  };

  // Identify the last selected active exam (e.g. R-6, or R-5, R-4, etc.)
  const lastActiveExam = activeExams.length > 0 ? activeExams[activeExams.length - 1] : null;

  // Sort students from HIGH to LOW based on total marks in the last active exam
  const sortedStudents = React.useMemo(() => {
    if (!students || students.length === 0) return [];
    if (!lastActiveExam) return [...students];

    return [...students].sort((a, b) => {
      const totalA = calcStudentExamTotal(a, lastActiveExam);
      const totalB = calcStudentExamTotal(b, lastActiveExam);

      const valA = (totalA !== null && totalA !== undefined) ? totalA : -1;
      const valB = (totalB !== null && totalB !== undefined) ? totalB : -1;

      if (valB !== valA) {
        return valB - valA; // Descending: High to Low
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, lastActiveExam, subjects]);

  const calcAverage = (valuesArray) => {
    const valid = valuesArray.filter(v => v !== null && v !== undefined && typeof v === 'number');
    if (valid.length === 0) return null;
    return valid.reduce((s, v) => s + v, 0) / valid.length;
  };

  const getCellClass = (val, maxMark) => {
    if (val === null || val === undefined || val === 'AB' || val === 'NA') return 'ccr-cell-ab';
    if (typeof val === 'number' && maxMark && maxMark > 0) {
      const passmark = maxMark * 0.4;
      if (val < passmark) return 'ccr-cell-fail';
      if (val / maxMark >= 0.9) return 'ccr-cell-excellent';
    }
    return '';
  };

  return (
    <div className="ccr-a4-landscape-container">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 4mm 6mm !important;
          }
        }
      `}</style>

      <div className="ccr-a4-page" ref={reportRef}>

        {/* TOP COLOUR BAND */}
        <div className="ccr-top-band" />

        {/* SCHOOL HEADER */}
        <div className="ccr-report-header">

          {/* Left: Logo */}
          <div className="ccr-logo-container">
            {logoUrl
              ? <img src={logoUrl} alt="School Logo" className="ccr-logo-img" />
              : <div className="ccr-default-logo">&#x1F3EB;</div>
            }
          </div>

          {/* Centre: School name & subtitle */}
          <div className="ccr-school-info">
            <h2 className="ccr-school-name">{schoolName}</h2>
            <p className="ccr-report-subtitle">
              Subject Consolidated Performance Report{' '}
              <span className="ccr-subtitle-pipe">|</span>{' '}
              <span className="ccr-subtitle-year">{academicYear}</span>
            </p>
            <div className="ccr-grade-heading">
              GRADE {className.toUpperCase()} &mdash; TARGET &amp; REVIEW MARKS
            </div>
          </div>

          {/* Right: Class & Students count */}
          <div className="ccr-header-meta">
            <div className="ccr-meta-item">
              <span className="ccr-meta-label">CLASS</span>
              <span className="ccr-meta-value">{className}</span>
            </div>
            <div className="ccr-meta-divider" />
            <div className="ccr-meta-item">
              <span className="ccr-meta-label">STUDENTS</span>
              <span className="ccr-meta-value">{students.length}</span>
            </div>
          </div>

        </div>

        {/* CONSOLIDATED MARKS TABLE */}
        <div className="ccr-table-wrapper">
          <table className="ccr-table">
            <thead>
              {/* Row 1: Subject Names — SNO/NAME span 3 rows */}
              <tr className="ccr-tr-subjects">
                <th className="ccr-th-sno" rowSpan={3}>S.NO</th>
                <th className="ccr-th-name" rowSpan={3}>STUDENT NAME</th>
                {subjects.map(sub => (
                  <th key={sub} className="ccr-th-subject" colSpan={subColCount}>
                    {sub}
                  </th>
                ))}
                <th className="ccr-th-subject ccr-th-tot" colSpan={subColCount}>TOTAL</th>
              </tr>

              {/* Row 2: Sub-columns with Exam Names directly (TGT + Selected Exam Names) */}
              <tr className="ccr-tr-subcols">
                {subjects.map(sub => (
                  <React.Fragment key={`subcol-${sub}`}>
                    {showTgt && <th className="ccr-th-col-tgt">TGT</th>}
                    {activeExams.map((exam, ei) => (
                      <th key={`${sub}-${exam}`} className={`ccr-th-col-review ccr-th-col-r${ei + 1}`} title={exam}>
                        {exam}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
                {showTgt && <th className="ccr-th-col-tgt">TGT</th>}
                {activeExams.map((exam, ei) => (
                  <th key={`tot-${exam}`} className={`ccr-th-col-review ccr-th-col-r${ei + 1}`} title={exam}>
                    {exam}
                  </th>
                ))}
              </tr>

              {/* Row 3: Maximum Marks */}
              <tr className="ccr-tr-maxmarks">
                {subjects.map(sub => {
                  const max = getSubjectMax(sub);
                  return (
                    <React.Fragment key={`max-${sub}`}>
                      {showTgt && (
                        <th className="ccr-th-max ccr-th-max-tgt">
                          {targetMaxMarks?.[sub] || max}
                        </th>
                      )}
                      {activeExams.map((exam, ei) => (
                        <th key={`max-${sub}-${exam}`} className={`ccr-th-max ccr-th-max-r${ei + 1}`}>
                          {getMaxMark(exam, sub)}
                        </th>
                      ))}
                    </React.Fragment>
                  );
                })}
                {showTgt && <th className="ccr-th-max ccr-th-max-tgt">{targetTotalMax}</th>}
                {activeExams.map((exam, ei) => {
                  const examTotal = subjects.reduce((s, sub) => s + getMaxMark(exam, sub), 0);
                  return (
                    <th key={`max-tot-${exam}`} className={`ccr-th-max ccr-th-max-r${ei + 1}`}>
                      {examTotal}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sortedStudents.map((student, sIdx) => {
                const tgtTotal = showTgt ? calcStudentTgtTotal(student) : null;
                return (
                  <tr key={student.sno || sIdx} className={sIdx % 2 === 0 ? 'ccr-row-even' : 'ccr-row-odd'}>
                    <td className="ccr-td-sno">{sIdx + 1}</td>
                    <td className="ccr-td-name">{student.name}</td>
                    {subjects.map(sub => (
                      <React.Fragment key={`${student.sno || sIdx}-${sub}`}>
                        {showTgt && (
                          <td className={`ccr-td-tgt ${getCellClass(student.targets?.[sub], targetMaxMarks?.[sub] || getSubjectMax(sub))}`}>
                            {fmt(student.targets?.[sub])}
                          </td>
                        )}
                        {activeExams.map(exam => {
                          const val = student.marks[exam]?.[sub];
                          const max = getMaxMark(exam, sub);
                          return (
                            <td key={`${exam}-${sub}`} className={`ccr-td-mark ${getCellClass(val, max)}`}>
                              {fmt(val)}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {showTgt && (
                      <td className={`ccr-td-tot ccr-td-tgt ${getCellClass(tgtTotal, targetTotalMax)}`}>
                        {fmt(tgtTotal)}
                      </td>
                    )}
                    {activeExams.map(exam => {
                      const examTotal = calcStudentExamTotal(student, exam);
                      const examMaxTotal = subjects.reduce((s, sub) => s + getMaxMark(exam, sub), 0);
                      return (
                        <td key={`tot-${exam}`} className={`ccr-td-tot ${getCellClass(examTotal, examMaxTotal)}`}>
                          {fmt(examTotal)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

{/* CLASS AVERAGE row */}
               <tr className="ccr-tr-average">
                 <td className="ccr-td-avg-title" colSpan={2}>CLASS AVERAGE</td>
                 {subjects.map(sub => (
                  <React.Fragment key={`avg-${sub}`}>
                    {showTgt && (
                      <td className="ccr-td-avg-tgt">
                        {fmt(calcAverage(students.map(s => s.targets?.[sub])))}
                      </td>
                    )}
                    {activeExams.map(exam => {
                      const avgVal = calcAverage(students.map(s => s.marks[exam]?.[sub]));
                      const max = getMaxMark(exam, sub);
                      return (
                        <td key={`avg-${exam}-${sub}`} className={`ccr-td-avg-mark ${getCellClass(avgVal, max)}`}>
                          {fmt(avgVal)}
                        </td>
                      );
                    })}
                  </React.Fragment>
                ))}
                {showTgt && (
                  <td className={`ccr-td-avg-tgt ccr-td-avg-tot ${getCellClass(calcAverage(students.map(s => calcStudentTgtTotal(s))), targetTotalMax)}`}>
                    {fmt(calcAverage(students.map(s => calcStudentTgtTotal(s))))}
                  </td>
                )}
                {activeExams.map(exam => {
                  const avgTot = calcAverage(students.map(s => calcStudentExamTotal(s, exam)));
                  const examMaxTotal = subjects.reduce((s, sub) => s + getMaxMark(exam, sub), 0);
                  return (
                    <td key={`avg-tot-${exam}`} className={`ccr-td-avg-mark ccr-td-avg-tot ${getCellClass(avgTot, examMaxTotal)}`}>
                      {fmt(avgTot)}
                    </td>
                  );
                })}
              </tr>
              </tbody>
            </table>
        </div>

        {/* EXAM RANGE FOR AVERAGE DISPLAY */}
        {activeExams.length > 0 && (
          <div className="ccr-exam-range-display">
            <span>Average based on: </span>
            {activeExams.map((exam, idx) => (
              <span key={exam} className="ccr-exam-range-badge">
                {exam}
                {idx < activeExams.length - 1 && ' to '}
              </span>
            ))}
          </div>
        )}

        {/* MARK LEGEND */}
        <div className="ccr-mark-legend">
          <div className="ccr-legend-items">
            <span><span className="legend-dot absent-dot" /> AB / NA</span>
            <span><span className="legend-dot fail-dot" /> Below Pass Mark (&lt; 40%)</span>
            <span><span className="legend-dot excellent-dot" /> &ge; 90%</span>
          </div>
          <div className="ccr-legend-info">
            Pass Mark: 40% &nbsp;|&nbsp; Distinction: &ge; 90%
          </div>
        </div>

        {/* FOOTER */}
        <div className="ccr-report-footer">
          <div className="ccr-signature-box">Class Teacher</div>
          <div className="ccr-signature-box">Principal</div>
        </div>

        {/* BOTTOM COLOUR BAND */}
        <div className="ccr-bottom-band" />

      </div>
    </div>
  );
}
