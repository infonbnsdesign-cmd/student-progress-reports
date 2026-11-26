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
  showSubjectAverage = true,
  schoolName = "NAVA BHARATH NATIONAL SCHOOL",
  logoUrl,
  academicYear = "2026-27",
}) {
  const reportRef = useRef(null);
  const { className, subjects, students, exams, hasTargets, targetMaxMarks } = classData;

  const reviewLabels = ['R-1', 'R-2', 'R-3', 'R-4', 'R-5', 'R-6'];
  const activeExams = selectedExams.filter(e => exams[e]);

  const showTgt = hasTargets;
  const hasAvgCol = showSubjectAverage && activeExams.length > 0;
  const subColCount = (showTgt ? 1 : 0) + activeExams.length + (hasAvgCol ? 1 : 0);
  const totalSubjectSpan = (subjects.length + 1) * (subColCount || 1);

  const getMaxMark = (examName, sub) => exams[examName]?.subjects[sub] || 100;

  const getSubjectMax = (sub) => {
    if (activeExams.length > 0) return getMaxMark(activeExams[0], sub);
    if (showTgt && targetMaxMarks) return targetMaxMarks[sub] || 100;
    return 100;
  };

  const isNeet = (className || '').toLowerCase().includes('neet');
  const effectiveSubjectCount = subjects.length > 5 ? 5 : subjects.length;

  const getExamTotalMax = (examName) => {
    if (isNeet) {
      const sumMax = subjects.reduce((s, sub) => s + getMaxMark(examName, sub), 0);
      return sumMax > 0 ? sumMax : 720;
    }
    const sampleMax = subjects.length > 0 ? (exams[examName]?.subjects[subjects[0]] || 100) : 100;
    if (sampleMax === 25) return effectiveSubjectCount * 25;
    if (sampleMax === 50) return effectiveSubjectCount * 50;
    return effectiveSubjectCount * sampleMax;
  };

  const targetTotalMax = isNeet
    ? (subjects.reduce((s, sub) => s + (targetMaxMarks?.[sub] || getSubjectMax(sub)), 0) || 720)
    : effectiveSubjectCount * (subjects.length > 0 ? (targetMaxMarks?.[subjects[0]] || getSubjectMax(subjects[0])) : 100);

  /**
   * Returns true if the student has at least one numeric or AB mark
   * in any selected exam for the given subject.
   * Used to determine whether a subject is "active" for this student.
   */
  const isSubjectActiveForStudent = (student, sub) => {
    if (activeExams.length === 0) {
      const tgtVal = student.targets?.[sub];
      return typeof tgtVal === 'number' || tgtVal === 'AB' || tgtVal === 'OD';
    }
    return activeExams.some(exam => {
      const val = student.marks[exam]?.[sub];
      return typeof val === 'number' || val === 'AB' || val === 'OD';
    });
  };

  const fmt = (val) => {
    if (val === null || val === undefined || val === '-' || val === '' || val === 'NA' || val === 'N/A') return '-';
    if (val === 'AB') return 'AB';
    if (val === 'OD') return 'OD';
    if (typeof val === 'number') return Math.round(val);
    return val;
  };

  const calcStudentExamTotal = (student, examName) => {
    let total = 0;
    let hasNumber = false;
    let hasAb = false;
    subjects.forEach(sub => {
      // Skip subjects that are not active for this student (all '-' across all exams)
      if (!isSubjectActiveForStudent(student, sub)) return;
      const val = student.marks[examName]?.[sub];
      if (typeof val === 'number') {
        total += val;
        hasNumber = true;
      } else if (val === 'AB') {
        hasAb = true;
      }
    });
    if (hasNumber) return total;
    if (hasAb) return 0;
    return '-';
  };

  const calcStudentTgtTotal = (student) => {
    if (!student.targets) return '-';
    let total = 0;
    let hasNumber = false;
    subjects.forEach(sub => {
      if (!isSubjectActiveForStudent(student, sub)) return;
      const val = student.targets[sub];
      if (typeof val === 'number') {
        total += val;
        hasNumber = true;
      }
    });
    return hasNumber ? total : '-';
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

      const valA = typeof totalA === 'number' ? totalA : -1;
      const valB = typeof totalB === 'number' ? totalB : -1;

      if (valB !== valA) {
        return valB - valA; // Descending: High to Low
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, lastActiveExam, subjects]);

  const calcAverage = (valuesArray) => {
    const valid = (valuesArray || []).filter(v => typeof v === 'number');
    if (valid.length === 0) return '-';
    return valid.reduce((s, v) => s + v, 0) / valid.length;
  };

  const getCellClass = (val, maxMark) => {
    if (val === null || val === undefined || val === '-' || val === '' || val === 'NA' || val === 'N/A') return 'ccr-cell-empty';
    if (val === 'AB') return 'ccr-cell-ab';
    if (val === 'OD') return 'ccr-cell-od';
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
              Subject-wise Exam Comparison Report{' '}
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

              {/* Row 2: Sub-columns with Exam Names directly (TGT + Selected Exam Names + AVG) */}
              <tr className="ccr-tr-subcols">
                {subjects.map(sub => (
                  <React.Fragment key={`subcol-${sub}`}>
                    {showTgt && <th className="ccr-th-col-tgt">TGT</th>}
                    {activeExams.map((exam, ei) => (
                      <th key={`${sub}-${exam}`} className={`ccr-th-col-review ccr-th-col-r${ei + 1}`} title={exam}>
                        {exam}
                      </th>
                    ))}
                    {hasAvgCol && (
                      <th className="ccr-th-col-avg" title={`${sub} Average`}>
                        AVG
                      </th>
                    )}
                  </React.Fragment>
                ))}
                {showTgt && <th className="ccr-th-col-tgt">TGT</th>}
                {activeExams.map((exam, ei) => (
                  <th key={`tot-${exam}`} className={`ccr-th-col-review ccr-th-col-r${ei + 1}`} title={exam}>
                    {exam}
                  </th>
                ))}
                {hasAvgCol && (
                  <th className="ccr-th-col-avg" title="Total Average">
                    AVG
                  </th>
                )}
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
                      {hasAvgCol && (
                        <th className="ccr-th-max ccr-th-max-avg">
                          {max}
                        </th>
                      )}
                    </React.Fragment>
                  );
                })}
                {showTgt && <th className="ccr-th-max ccr-th-max-tgt">{targetTotalMax}</th>}
                {activeExams.map((exam, ei) => {
                  const examTotal = getExamTotalMax(exam);
                  return (
                    <th key={`max-tot-${exam}`} className={`ccr-th-max ccr-th-max-r${ei + 1}`}>
                      {examTotal}
                    </th>
                  );
                })}
                {hasAvgCol && (
                  <th className="ccr-th-max ccr-th-max-avg">
                    {activeExams.length > 0 ? getExamTotalMax(activeExams[0]) : targetTotalMax}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {sortedStudents.map((student, sIdx) => {
                const tgtTotal = showTgt ? calcStudentTgtTotal(student) : null;
                return (
                  <tr key={student.sno || sIdx} className={sIdx % 2 === 0 ? 'ccr-row-even' : 'ccr-row-odd'}>
                    <td className="ccr-td-sno">{sIdx + 1}</td>
                    <td className="ccr-td-name">{student.name}</td>
                    {subjects.map(sub => {
                      const isActive = isSubjectActiveForStudent(student, sub);
                      const subExamMarks = isActive
                        ? activeExams.map(exam => student.marks[exam]?.[sub])
                        : [];
                      const subAvg = isActive ? calcAverage(subExamMarks) : '-';
                      const subMax = getSubjectMax(sub);
                      return (
                        <React.Fragment key={`${student.sno || sIdx}-${sub}`}>
                          {showTgt && (
                            <td className={`ccr-td-tgt ${getCellClass(student.targets?.[sub], targetMaxMarks?.[sub] || getSubjectMax(sub))}`}>
                              {fmt(student.targets?.[sub])}
                            </td>
                          )}
                          {activeExams.map(exam => {
                            const val = isActive ? student.marks[exam]?.[sub] : '-';
                            const max = getMaxMark(exam, sub);
                            return (
                              <td key={`${exam}-${sub}`} className={`ccr-td-mark ${getCellClass(val, max)}`}>
                                {fmt(val)}
                              </td>
                            );
                          })}
                          {hasAvgCol && (
                            <td className={`ccr-td-avg-val ${getCellClass(subAvg, subMax)}`}>
                              {fmt(subAvg)}
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {showTgt && (
                      <td className={`ccr-td-tot ccr-td-tgt ${getCellClass(tgtTotal, targetTotalMax)}`}>
                        {fmt(tgtTotal)}
                      </td>
                    )}
                    {activeExams.map(exam => {
                      const examTotal = calcStudentExamTotal(student, exam);
                      const examMaxTotal = getExamTotalMax(exam);
                      return (
                        <td key={`tot-${exam}`} className={`ccr-td-tot ${getCellClass(examTotal, examMaxTotal)}`}>
                          {fmt(examTotal)}
                        </td>
                      );
                    })}
                    {hasAvgCol && (() => {
                      const studentExamTotals = activeExams
                        .map(exam => calcStudentExamTotal(student, exam))
                        .filter(t => typeof t === 'number');
                      const studentAvgTotal = studentExamTotals.length > 0
                        ? (studentExamTotals.reduce((a, b) => a + b, 0) / studentExamTotals.length)
                        : '-';
                      const examMaxTotal = activeExams.length > 0 ? getExamTotalMax(activeExams[0]) : targetTotalMax;
                      return (
                        <td className={`ccr-td-tot ccr-td-avg-val ${getCellClass(studentAvgTotal, examMaxTotal)}`}>
                          {fmt(studentAvgTotal)}
                        </td>
                      );
                    })()}
                  </tr>
                );
              })}

{/* CLASS AVERAGE row */}
               <tr className="ccr-tr-average">
                 <td className="ccr-td-avg-title" colSpan={2}>CLASS AVERAGE</td>
                 {subjects.map(sub => {
                   const classSubAvg = calcAverage(students.map(s => calcAverage(activeExams.map(e => s.marks[e]?.[sub]))));
                   const subMax = getSubjectMax(sub);
                   return (
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
                       {hasAvgCol && (
                         <td className={`ccr-td-avg-mark ccr-td-avg-val ${getCellClass(classSubAvg, subMax)}`}>
                           {fmt(classSubAvg)}
                         </td>
                       )}
                     </React.Fragment>
                   );
                 })}
                {showTgt && (
                  <td className={`ccr-td-avg-tgt ccr-td-avg-tot ${getCellClass(calcAverage(students.map(s => calcStudentTgtTotal(s))), targetTotalMax)}`}>
                    {fmt(calcAverage(students.map(s => calcStudentTgtTotal(s))))}
                  </td>
                )}
                {activeExams.map(exam => {
                  const studentTotals = students
                    .map(s => calcStudentExamTotal(s, exam))
                    .filter(t => typeof t === 'number');
                  const avgTot = studentTotals.length > 0 ? (studentTotals.reduce((a, b) => a + b, 0) / studentTotals.length) : '-';
                  const examMaxTotal = getExamTotalMax(exam);
                  return (
                    <td key={`avg-tot-${exam}`} className={`ccr-td-avg-mark ccr-td-avg-tot ${getCellClass(avgTot, examMaxTotal)}`}>
                      {fmt(avgTot)}
                    </td>
                  );
                })}
                {hasAvgCol && (() => {
                  const studentTotals = students
                    .map(s => {
                      const tList = activeExams
                        .map(exam => calcStudentExamTotal(s, exam))
                        .filter(t => typeof t === 'number');
                      return tList.length > 0 ? (tList.reduce((a, b) => a + b, 0) / tList.length) : null;
                    })
                    .filter(t => typeof t === 'number');
                  const classTotAvg = studentTotals.length > 0
                    ? (studentTotals.reduce((a, b) => a + b, 0) / studentTotals.length)
                    : '-';
                  const examMaxTotal = activeExams.length > 0 ? getExamTotalMax(activeExams[0]) : targetTotalMax;
                  return (
                    <td className={`ccr-td-avg-mark ccr-td-avg-tot ccr-td-avg-val ${getCellClass(classTotAvg, examMaxTotal)}`}>
                      {fmt(classTotAvg)}
                    </td>
                  );
                })()}
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

        {/* BOTTOM COLOUR BAND */}
        <div className="ccr-bottom-band" />

      </div>
    </div>
  );
}
