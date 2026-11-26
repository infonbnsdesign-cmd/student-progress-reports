import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { parseExcelWorkbook, getExamTypeLabel } from './utils/excelParser';
import { downloadSampleExcel } from './utils/sampleData';
import ReportCard from './components/ReportCard';
import ClassConsolidatedReport from './components/ClassConsolidatedReport';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import defaultLogo from '../logo/nbns.png';

function ExamOrderList({ title, allExams, selectedExams, setSelectedExams }) {
  const handleToggle = (examName) => {
    setSelectedExams(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  const moveUp = (examName) => {
    setSelectedExams(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const moveDown = (examName) => {
    setSelectedExams(prev => {
      const idx = prev.indexOf(examName);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const selectAll = () => {
    setSelectedExams([...allExams]);
  };

  const clearAll = () => {
    setSelectedExams([]);
  };

  const unselectedExams = allExams.filter(e => !selectedExams.includes(e));

  return (
    <div className="control-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="control-label" style={{ margin: 0, fontWeight: '700' }}>{title}</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn-link-action" onClick={selectAll}>All</button>
          <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>|</span>
          <button type="button" className="btn-link-action" onClick={clearAll}>Clear</button>
        </div>
      </div>
      <div className="checkbox-list exam-order-list">
        {selectedExams.map((exam, idx) => (
          <div key={exam} className="exam-order-item selected">
            <input 
              type="checkbox" 
              className="checkbox-input"
              checked={true}
              onChange={() => handleToggle(exam)}
            />
            <span className="exam-order-label">{exam}</span>
            <span className="badge-order" title={`Column #${idx + 1} in report`}>#{idx + 1}</span>
            <div className="order-btn-group">
              <button 
                type="button" 
                className="btn-order" 
                disabled={idx === 0} 
                onClick={() => moveUp(exam)}
                title="Move First / Earlier"
              >
                ▲
              </button>
              <button 
                type="button" 
                className="btn-order" 
                disabled={idx === selectedExams.length - 1} 
                onClick={() => moveDown(exam)}
                title="Move Second / Later"
              >
                ▼
              </button>
            </div>
          </div>
        ))}

        {unselectedExams.map(exam => (
          <div key={exam} className="exam-order-item unselected">
            <input 
              type="checkbox" 
              className="checkbox-input"
              checked={false}
              onChange={() => handleToggle(exam)}
            />
            <span className="exam-order-label" style={{ opacity: 0.65 }}>{exam}</span>
            <span className="badge-order-unselected">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [excelData, setExcelData] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedWts, setSelectedWts] = useState([]);
  const [selectedMts, setSelectedMts] = useState([]);
  const [selectedCpts, setSelectedCpts] = useState([]);
  const [selectedSpts, setSelectedSpts] = useState([]);
  const [selectedOthers, setSelectedOthers] = useState([]);
  const [selectedExamsByType, setSelectedExamsByType] = useState({});
  const [showExamsWithoutAveraging, setShowExamsWithoutAveraging] = useState(false);
  const [consolidatedExams, setConsolidatedExams] = useState(['', '', '', '', '', '']); // R-1 to R-6
  const [showConsolidatedSubjectAverage, setShowConsolidatedSubjectAverage] = useState(true);
  const [graphExamType, setGraphExamType] = useState('AUTO');
  const [selectedGraphExams, setSelectedGraphExams] = useState([]);
  const [avgExamMode, setAvgExamMode] = useState('AUTO');
  const [selectedAvgExams, setSelectedAvgExams] = useState([]);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [logoUrl, setLogoUrl] = useState(defaultLogo);
  const [schoolName, setSchoolName] = useState('Nava Bharath National School');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [reportDate, setReportDate] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('preview');
  const [isDragging, setIsDragging] = useState(false);

  // Load logo and school name from localStorage on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('school_logo');
    if (savedLogo) setLogoUrl(savedLogo);

    const savedSchool = localStorage.getItem('school_name');
    if (savedSchool) setSchoolName(savedSchool);

    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Update theme helper
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Save school name to localStorage
  const handleSchoolNameChange = (e) => {
    const val = e.target.value;
    setSchoolName(val);
    localStorage.setItem('school_name', val);
  };

  // Logo upload handler
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setLogoUrl(dataUrl);
      localStorage.setItem('school_logo', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Clear logo
  const clearLogo = () => {
    setLogoUrl('');
    localStorage.removeItem('school_logo');
  };

  // Process uploaded Excel file
  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseExcelWorkbook(e.target.result);
        if (Object.keys(parsed.classes).length === 0) {
          alert('Could not find any valid class mark sheets in this workbook. Please ensure cell B3 is labeled "MAX".');
          return;
        }
        setExcelData(parsed);

        // Select first class, first student, and all detected exams by default
        const classes = Object.keys(parsed.classes);
        const defaultClass = classes[0];
        setSelectedClass(defaultClass);

        const classData = parsed.classes[defaultClass];
        if (classData.students.length > 0) {
          setSelectedStudent(classData.students[0]);
        }

        // Set default selected exams by type
        const typesMap = {};
        Object.values(classData.exams).forEach(exam => {
          const t = exam.type || 'OTHER';
          if (!typesMap[t]) typesMap[t] = [];
          typesMap[t].push(exam.name);
        });
        setSelectedExamsByType(typesMap);
        setSectionOrder(Object.keys(typesMap));
        setSelectedWts(typesMap['WT'] || []);
        setSelectedMts(typesMap['MT'] || []);
        setSelectedCpts(typesMap['CPT'] || []);
        setSelectedSpts(typesMap['SPT'] || []);
        setSelectedOthers(typesMap['OTHER'] || []);
        // Auto-select first 6 exams for consolidated report
        const allExamNames = Object.keys(classData.exams);
        setConsolidatedExams([
          allExamNames[0] || '',
          allExamNames[1] || '',
          allExamNames[2] || '',
          allExamNames[3] || '',
          allExamNames[4] || '',
          allExamNames[5] || ''
        ]);
        setGraphExamType('AUTO');
        setSelectedGraphExams(typesMap['SPT']?.length > 0 ? typesMap['SPT'] : (typesMap['CPT']?.length > 0 ? typesMap['CPT'] : (typesMap['WT']?.length > 0 ? typesMap['WT'] : (typesMap['MT'] || []))));
        setAvgExamMode('AUTO');
        setSelectedAvgExams([]);
      } catch (err) {
        console.error(err);
        alert('Failed to parse Excel file. Please ensure it matches the template format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    } else {
      alert('Please upload an Excel spreadsheet (.xlsx or .xls)');
    }
  };

  // Change selected class
  const handleClassChange = (e) => {
    const className = e.target.value;
    setSelectedClass(className);
    const classData = excelData.classes[className];
    
    if (classData.students.length > 0) {
      setSelectedStudent(classData.students[0]);
    } else {
      setSelectedStudent(null);
    }

    // Reset exams list based on this class
    const typesMap = {};
    Object.values(classData.exams).forEach(exam => {
      const t = exam.type || 'OTHER';
      if (!typesMap[t]) typesMap[t] = [];
      typesMap[t].push(exam.name);
    });
    setSelectedExamsByType(typesMap);
    setSectionOrder(Object.keys(typesMap));
    setSelectedWts(typesMap['WT'] || []);
    setSelectedMts(typesMap['MT'] || []);
    setSelectedCpts(typesMap['CPT'] || []);
    setSelectedSpts(typesMap['SPT'] || []);
    setSelectedOthers(typesMap['OTHER'] || []);
    // Reset consolidated exams for new class (up to 6)
    const allExamNames = Object.keys(classData.exams);
    setConsolidatedExams([
      allExamNames[0] || '',
      allExamNames[1] || '',
      allExamNames[2] || '',
      allExamNames[3] || '',
      allExamNames[4] || '',
      allExamNames[5] || ''
    ]);
    setGraphExamType('AUTO');
    setSelectedGraphExams(typesMap['SPT']?.length > 0 ? typesMap['SPT'] : (typesMap['CPT']?.length > 0 ? typesMap['CPT'] : (typesMap['WT']?.length > 0 ? typesMap['WT'] : (typesMap['MT'] || []))));
    setAvgExamMode('AUTO');
    setSelectedAvgExams([]);
  };

  // Change selected student
  const handleStudentChange = (e) => {
    const studentSno = parseFloat(e.target.value);
    const classData = excelData.classes[selectedClass];
    const student = classData.students.find(s => s.sno === studentSno);
    setSelectedStudent(student);
  };

  // Toggle WT exam selection
  const handleWtToggle = (examName) => {
    setSelectedWts(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Toggle MT exam selection
  const handleMtToggle = (examName) => {
    setSelectedMts(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Toggle CPT exam selection
  const handleCptToggle = (examName) => {
    setSelectedCpts(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Toggle SPT exam selection
  const handleSptToggle = (examName) => {
    setSelectedSpts(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Toggle other/custom exam selection
  const handleOtherToggle = (examName) => {
    setSelectedOthers(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Move WT exam up
  const handleWtMoveUp = (examName) => {
    setSelectedWts(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      return newList;
    });
  };

  // Move WT exam down
  const handleWtMoveDown = (examName) => {
    setSelectedWts(prev => {
      const idx = prev.indexOf(examName);
      if (idx >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      return newList;
    });
  };

  // Move MT exam up
  const handleMtMoveUp = (examName) => {
    setSelectedMts(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      return newList;
    });
  };

  // Move MT exam down
  const handleMtMoveDown = (examName) => {
    setSelectedMts(prev => {
      const idx = prev.indexOf(examName);
      if (idx >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      return newList;
    });
  };

  // Move CPT exam up
  const handleCptMoveUp = (examName) => {
    setSelectedCpts(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      return newList;
    });
  };

  // Move CPT exam down
  const handleCptMoveDown = (examName) => {
    setSelectedCpts(prev => {
      const idx = prev.indexOf(examName);
      if (idx >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      return newList;
    });
  };

  // Move SPT exam up
  const handleSptMoveUp = (examName) => {
    setSelectedSpts(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      return newList;
    });
  };

  // Move SPT exam down
  const handleSptMoveDown = (examName) => {
    setSelectedSpts(prev => {
      const idx = prev.indexOf(examName);
      if (idx >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      return newList;
    });
  };

  // Move other exam up
  const handleOtherMoveUp = (examName) => {
    setSelectedOthers(prev => {
      const idx = prev.indexOf(examName);
      if (idx <= 0) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      return newList;
    });
  };

  // Move other exam down
  const handleOtherMoveDown = (examName) => {
    setSelectedOthers(prev => {
      const idx = prev.indexOf(examName);
      if (idx >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      return newList;
    });
  };

  // Toggle custom graph exam selection
  const handleGraphExamToggle = (examName) => {
    setSelectedGraphExams(prev => 
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Toggle custom average exam selection
  const handleAvgExamToggle = (examName) => {
    setSelectedAvgExams(prev =>
      prev.includes(examName) ? prev.filter(name => name !== examName) : [...prev, examName]
    );
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Download all batch student reports as a multi-page A4 portrait PDF
  const handleBatchDownloadPdf = async () => {
    const cards = document.querySelectorAll('.report-card');
    if (!cards || cards.length === 0) return;

    const btn = document.getElementById('btn-batch-download-pdf');
    if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;

      for (let i = 0; i < cards.length; i++) {
        const canvas = await html2canvas(cards[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgW = pageW;
        const imgH = (canvas.height / canvas.width) * pageW;

        let finalW = imgW;
        let finalH = imgH;
        if (imgH > pageH) {
          finalH = pageH;
          finalW = (canvas.width / canvas.height) * pageH;
        }

        const offsetX = (pageW - finalW) / 2;
        const offsetY = (pageH - finalH) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalW, finalH);

        if (btn) btn.textContent = `⏳ ${i + 1}/${cards.length}...`;
      }

      const fileName = `${selectedClass || 'Batch'}_All_Reports.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Batch PDF export failed', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      if (btn) { btn.textContent = '📄 Download PDF'; btn.disabled = false; }
    }
  };

  // Download single student report as A4 portrait PDF
  const handleDownloadPdf = async () => {
    const node = document.querySelector('.report-card');
    if (!node) return;

    const btn = document.getElementById('btn-download-pdf');
    if (btn) { btn.textContent = '⏳ Generating...'; btn.disabled = true; }

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // A4 portrait in mm: 210 x 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;

      // Scale image to fill A4 width, keep aspect ratio
      const imgW = pageW;
      const imgH = (canvas.height / canvas.width) * pageW;

      // If taller than A4, scale down to fit height
      let finalW = imgW;
      let finalH = imgH;
      if (imgH > pageH) {
        finalH = pageH;
        finalW = (canvas.width / canvas.height) * pageH;
      }

      const offsetX = (pageW - finalW) / 2;
      const offsetY = (pageH - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalW, finalH);

      const fileName = selectedStudent
        ? `${selectedStudent.name.replace(/\s+/g, '_')}_${selectedClass}_Report.pdf`
        : 'Report.pdf';
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      if (btn) { btn.textContent = '📄 Download PDF'; btn.disabled = false; }
    }
  };

  // Export report card to Image (PNG)
  const handleExportPng = () => {
    const node = document.querySelector('.report-card');
    if (!node) return;

    // Show a loading text or disable button temporarily
    const btn = document.querySelector('.btn-export-image');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating...';
    btn.disabled = true;

    // Use html-to-image to capture the A4 report card block
    toPng(node, { 
      cacheBust: true, 
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        boxShadow: 'none',
        borderRadius: '0'
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const fileName = `${selectedStudent.name.replace(/\s+/g, '_')}_${selectedClass}_Report.png`;
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
      })
      .catch((error) => {
        console.error('PNG Export failed', error);
        alert('Failed to generate image. Please try using Chrome or Edge.');
        btn.innerHTML = originalText;
        btn.disabled = false;
      });
  };

  // Load demo data directly into memory
  const handleLoadDemoData = () => {
    const wb = XLSX.utils.book_new();

    // Data 10-A
    const row1 = ['S.no ', 'Name', 'WT-I', null, null, null, null, 'WT-2', null, null, null, null, 'WT3', null, null, null, null, 'WT4', null, null, null, null, 'WT5', null, null, null, null, 'WT6', null, null, null, null, 'WT7', null, null, null, null, 'WT8', null, null, null, null, 'WT9', null, null, null, null, 'MT-I', null, null, null, null, 'MT-II', null, null, null, null, 'MT-III', null, null, null, null];
    const row2 = [null, null, 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI'];
    const row3 = [null, 'MAX', 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    
    const s1 = [1.0, 'AADHYA S', 21, 22, 20, 19, 21, 21, 21, 21, 21, 6, 23, 21, 13, 22, 16, 21, 19, 15, 23, 19, 22, 23, 16, 20, 19, 22, 23.5, 12, 20, 16, 21, 21.5, 19, 22, 19, 23, 16, 'AB', 22, 21, 24, 24, 16, 20, 21, 45, 45, 15, 41, 46, 43, 41, 33, 39, 44, 43, 40, 38, 47, 43];
    const s2 = [2.0, 'ABHINAND G', 22, 23, 22, 22, 20, 20, 22, 23, 22, 18, 22, 22, 21, 21, 22, 22, 22, 18, 24, 18, 21.5, 24, 21, 18, 23, 22, 21, 23, 22, 18, 23, 21, 22, 24, 23, 22, 22, 'AB', 24, 21, 21, 23, 18, 21, 22, 41, 48, 38, 42, 45, 44, 41, 39, 42, 48, 42, 44, 42, 46, 42];
    const s3 = [3.0, 'OVIYA B', 23, 24, 22, 21, 25, 19, 25, 25, 19, 21, 25, 25, 20, 23, 17, 19, 22, 20, 24, 23, 22, 22.5, 23, 20, 22, 19, 24, 22, 25, 20, 22, 23.5, 19, 23, 24, 23, 'AB', 22, 23, 25, 23, 24, 20, 24, 24, 47, 49, 32, 46, 48, 44, 46, 40, 49, 47, 45, 48, 44, 48, 44];
    
    const ws1 = XLSX.utils.aoa_to_sheet([row1, row2, row3, s1, s2, s3]);
    XLSX.utils.book_append_sheet(wb, ws1, "10-A");

    // Data 10-B
    const row1_B = ['S.no ', 'Name', 'MONTHLY TEST-I ', null, null, null, null, 'WEEKLY TEST-I', null, null, null, null, 'WEEKLY TEST-II', null, null, null, null];
    const row2_B = [null, null, 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI'];
    const row3_B = [null, 'MAX', 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, null, null, null, null];
    const s1_B = [1.0, 'BHAVADHARANI T S', 37, 50, 13, 35, 24, 18, 20, 11, 14, 16, 14, 21, 4, 8, 11];
    
    const ws2 = XLSX.utils.aoa_to_sheet([row1_B, row2_B, row3_B, s1_B]);
    XLSX.utils.book_append_sheet(wb, ws2, "10-B");

    const wopts = { bookType: 'xlsx', bookSST: false, type: 'array' };
    const htmlOut = XLSX.write(wb, wopts);
    const parsed = parseExcelWorkbook(htmlOut);
    
    setExcelData(parsed);
    setSelectedClass("10-A");
    
    const classData = parsed.classes["10-A"];
    setSelectedStudent(classData.students[0]);

    // Select all exams by default
    const typesMap = {};
    Object.values(classData.exams).forEach(exam => {
      const t = exam.type || 'OTHER';
      if (!typesMap[t]) typesMap[t] = [];
      typesMap[t].push(exam.name);
    });
    setSelectedExamsByType(typesMap);
    setSectionOrder(Object.keys(typesMap));
    setSelectedWts(typesMap['WT'] || []);
    setSelectedMts(typesMap['MT'] || []);
    setSelectedCpts(typesMap['CPT'] || []);
    setSelectedSpts(typesMap['SPT'] || []);
    setSelectedOthers(typesMap['OTHER'] || []);
    setGraphExamType('AUTO');
    setSelectedGraphExams(typesMap['SPT']?.length > 0 ? typesMap['SPT'] : (typesMap['CPT']?.length > 0 ? typesMap['CPT'] : (typesMap['WT']?.length > 0 ? typesMap['WT'] : (typesMap['MT'] || []))));
    setAvgExamMode('AUTO');
    setSelectedAvgExams([]);
  };

  // Get active class data
  const activeClassData = excelData && selectedClass ? excelData.classes[selectedClass] : null;

  // CACMA classes print two A5 reports per A4 sheet (cut A4 down the middle)
  const isCacmaClass = selectedClass ? selectedClass.replace(/\s+/g, '').toLowerCase().includes('cacma') : false;

  // Split students into pairs (2 reports per A4 sheet)
  const pairStudents = (arr, size = 2) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  };

  // Derive exam types present in activeClassData:
  const examTypesMap = useMemo(() => {
    if (!activeClassData || !activeClassData.exams) return {};
    const map = {};
    Object.values(activeClassData.exams).forEach(exam => {
      const type = exam.type || 'OTHER';
      if (!map[type]) map[type] = [];
      map[type].push(exam.name);
    });
    return map;
  }, [activeClassData]);

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          <span className="brand-name">Progressify</span>
        </div>

        {/* 1. File Upload Dropzone */}
        <div className="control-group">
          <label className="control-label">Marks Database</label>
          <div 
            className="uploader-dropzone" 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('excel-file').click()}
            style={{ borderColor: isDragging ? 'var(--success)' : 'var(--primary)' }}
          >
            <span className="uploader-icon">📁</span>
            <span className="uploader-text">Upload Marks Excel</span>
            <span className="uploader-subtext">Drag & drop or click to browse</span>
            <input 
              type="file" 
              id="excel-file" 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {excelData ? (
          <>
            {/* 2. School Info Customize */}
            <div className="control-group">
              <label className="control-label">School Details & Date</label>
              <input 
                type="text" 
                className="select-input" 
                placeholder="School Name"
                value={schoolName}
                onChange={handleSchoolNameChange}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input 
                  type="text" 
                  className="select-input" 
                  placeholder="Academic Year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{ flex: 1 }}
                  title="Academic Year (e.g. 2026-27)"
                />
                <input 
                  type="text" 
                  className="select-input" 
                  placeholder="Report Date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{ flex: 1 }}
                  title="Report Generated Date (e.g. 17/09/2026)"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
                {logoUrl && (
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
                    onClick={clearLogo}
                  >
                    🗑️
                  </button>
                )}
                <input 
                  type="file" 
                  id="logo-upload" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            {/* 3. Class Selector */}
            <div className="control-group">
              <label className="control-label">Select Class</label>
              <select 
                className="select-input" 
                value={selectedClass} 
                onChange={handleClassChange}
              >
                {Object.keys(excelData.classes).map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            {/* 4. Student Selector (only show in preview tab) */}
            {activeTab === 'preview' && selectedStudent && (
              <div className="control-group">
                <label className="control-label">Select Student</label>
                <select 
                  className="select-input" 
                  value={selectedStudent.sno} 
                  onChange={handleStudentChange}
                >
                  {activeClassData.students.map(s => (
                    <option key={s.sno} value={s.sno}>{s.name} (Roll: {s.sno})</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4b. Consolidated Report Exam Selectors (only in consolidated tab) */}
            {activeTab === 'consolidated' && activeClassData && (
              <>
                <div className="control-group">
                  <label className="control-label">Map Exams to R-1 → R-6</label>
                  <div className="ccr-exam-selector">
                    {['R-1', 'R-2', 'R-3', 'R-4', 'R-5', 'R-6'].map((label, idx) => (
                      <div key={label} className="ccr-exam-slot">
                        <span className="ccr-exam-slot-label">{label}</span>
                        <select
                          className="select-input"
                          value={consolidatedExams[idx]}
                          onChange={(e) => {
                            const next = [...consolidatedExams];
                            next[idx] = e.target.value;
                            setConsolidatedExams(next);
                          }}
                        >
                          <option value="">— None —</option>
                          {Object.values(activeClassData.exams).map(exam => (
                            <option key={exam.name} value={exam.name}>
                              {exam.name} ({exam.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4c. Subject Average Selector (only in consolidated tab) */}
                <div className="control-group" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="control-label" style={{ color: '#059669', fontWeight: '700', margin: 0 }}>
                      📐 Subject Average Column
                    </label>
                  </div>
                  <select
                    className="select-input"
                    value={showConsolidatedSubjectAverage ? 'SHOW' : 'HIDE'}
                    onChange={(e) => setShowConsolidatedSubjectAverage(e.target.value === 'SHOW')}
                  >
                    <option value="SHOW">Show Average for each Subject</option>
                    <option value="HIDE">Hide Subject Average</option>
                  </select>
                </div>
              </>
            )}

            {/* Section Ordering Widget (when multiple table sections exist) */}
            {(() => {
              const allTypes = Object.keys(examTypesMap);
              const activeTypes = allTypes.filter(t => (selectedExamsByType[t] !== undefined ? selectedExamsByType[t].length > 0 : (examTypesMap[t] || []).length > 0));
              if (activeTypes.length <= 1) return null;

              const currentOrdered = sectionOrder.filter(s => activeTypes.includes(s));
              activeTypes.forEach(t => {
                if (!currentOrdered.includes(t)) currentOrdered.push(t);
              });

              const moveSec = (idx, dir) => {
                const targetIdx = idx + dir;
                if (targetIdx < 0 || targetIdx >= currentOrdered.length) return;
                const newOrdered = [...currentOrdered];
                const temp = newOrdered[idx];
                newOrdered[idx] = newOrdered[targetIdx];
                newOrdered[targetIdx] = temp;
                const remaining = sectionOrder.filter(s => !activeTypes.includes(s));
                setSectionOrder([...newOrdered, ...remaining]);
              };

              return (
                <div className="control-group" style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <label className="control-label" style={{ marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>
                    📑 Table Order (1st, 2nd in Report)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {currentOrdered.map((sec, idx) => (
                      <div key={sec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                        <span><strong style={{ color: 'var(--primary)' }}>#{idx + 1}</strong> {getExamTypeLabel(sec).tableTitle}</span>
                        <div className="order-btn-group">
                          <button type="button" className="btn-order" disabled={idx === 0} onClick={() => moveSec(idx, -1)} title="Move Table 1st / Earlier">▲</button>
                          <button type="button" className="btn-order" disabled={idx === currentOrdered.length - 1} onClick={() => moveSec(idx, 1)} title="Move Table 2nd / Later">▼</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Separate Exam Column Reorder & Select for each exam type */}
            {(() => {
              const allTypes = Object.keys(examTypesMap);
              const orderedTypes = sectionOrder.filter(t => allTypes.includes(t));
              allTypes.forEach(t => {
                if (!orderedTypes.includes(t)) orderedTypes.push(t);
              });

              return orderedTypes.map(type => {
                const allList = examTypesMap[type] || [];
                if (allList.length === 0) return null;
                const selList = selectedExamsByType[type] !== undefined ? selectedExamsByType[type] : allList;
                return (
                  <ExamOrderList 
                    key={type}
                    title={`${getExamTypeLabel(type).label} (Arrange Columns)`}
                    allExams={allList}
                    selectedExams={selList}
                    setSelectedExams={(updater) => {
                      setSelectedExamsByType(prev => {
                        const cur = prev[type] !== undefined ? prev[type] : allList;
                        const next = typeof updater === 'function' ? updater(cur) : updater;
                        return { ...prev, [type]: next };
                      });
                    }}
                  />
                );
              });
            })()}

            {/* 8c. Performance Graph Exam Selector */}
            {activeClassData && Object.keys(activeClassData.exams).length > 0 && (
              <div className="control-group graph-control-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="control-label" style={{ color: 'var(--primary)', fontWeight: '700' }}>
                    📊 Graph Exam Display
                  </label>
                </div>
                <select 
                  className="select-input"
                  value={graphExamType}
                  onChange={(e) => setGraphExamType(e.target.value)}
                >
                  <option value="AUTO">Auto (Recommended)</option>
                  {Object.keys(examTypesMap).map(type => (
                    <option key={type} value={type}>
                      {getExamTypeLabel(type).label} ({type})
                    </option>
                  ))}
                  <option value="CUSTOM">Specific Exams (Custom Pick)</option>
                  <option value="NONE">Hide Graph</option>
                </select>

                {/* If CUSTOM is selected, show checkboxes for all available exams in class */}
                {graphExamType === 'CUSTOM' && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Check exams to show:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          type="button"
                          className="btn-link-action"
                          onClick={() => setSelectedGraphExams(Object.keys(activeClassData.exams))}
                        >
                          All
                        </button>
                        <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>|</span>
                        <button 
                          type="button"
                          className="btn-link-action"
                          onClick={() => setSelectedGraphExams([])}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="checkbox-list" style={{ maxHeight: '140px' }}>
                      {Object.values(activeClassData.exams).map(exam => (
                        <label key={exam.name} className="checkbox-item">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={selectedGraphExams.includes(exam.name)}
                            onChange={() => handleGraphExamToggle(exam.name)}
                          />
                          <span>{exam.name} <small style={{ opacity: 0.7 }}>({exam.type})</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 8d. Average Column Exam Selector */}
            {activeClassData && Object.keys(activeClassData.exams).length > 0 && (
              <div className="control-group graph-control-group" style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="control-label" style={{ color: '#059669', fontWeight: '700' }}>
                    📐 Average Column
                  </label>
                </div>
                <select
                  className="select-input"
                  value={avgExamMode}
                  onChange={(e) => setAvgExamMode(e.target.value)}
                >
                  <option value="AUTO">Auto (all selected exams)</option>
                  <option value="CUSTOM">Custom – pick specific exams</option>
                  <option value="NONE">Hide Average Column</option>
                </select>
                {avgExamMode === 'CUSTOM' && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exams used for average:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn-link-action" onClick={() => setSelectedAvgExams(Object.keys(activeClassData.exams))}>All</button>
                        <span style={{ color: 'var(--text-light)', fontSize: '11px' }}>|</span>
                        <button type="button" className="btn-link-action" onClick={() => setSelectedAvgExams([])}>Clear</button>
                      </div>
                    </div>
                    <div className="checkbox-list" style={{ maxHeight: '140px' }}>
                      {Object.values(activeClassData.exams).map(exam => (
                        <label key={exam.name} className="checkbox-item">
                          <input
                            type="checkbox"
                            className="checkbox-input"
                            checked={selectedAvgExams.includes(exam.name)}
                            onChange={() => handleAvgExamToggle(exam.name)}
                          />
                          <span>{exam.name} <small style={{ opacity: 0.7 }}>({exam.type})</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. Action Button Panel */}
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handlePrint}>
                <span>🖨️</span> Print Report
              </button>
              {activeTab === 'preview' && (
                <button className="btn btn-secondary btn-export-image" onClick={handleExportPng}>
                  <span>🖼️</span> Export as PNG
                </button>
              )}
              {activeTab === 'preview' && (
                <button id="btn-download-pdf" className="btn btn-secondary" onClick={handleDownloadPdf}>
                  📄 Download PDF
                </button>
              )}
            </div>
          </>
        ) : null}

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }} 
            onClick={downloadSampleExcel}
          >
            📋 Download Template
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {excelData ? (
          <>
            {/* Top Navigation Tabs */}
            <div className="tabs-container">
              <button 
                className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Single Student Report
              </button>
              <button 
                className={`tab ${activeTab === 'batch' ? 'active' : ''}`}
                onClick={() => setActiveTab('batch')}
              >
                Batch Class Print ({activeClassData ? activeClassData.students.length : 0})
              </button>
              <button 
                className={`tab ${activeTab === 'consolidated' ? 'active' : ''}`}
                onClick={() => setActiveTab('consolidated')}
              >
                📊 Subject Consolidated Report
              </button>
            </div>

            {/* Dynamic Card Area */}
            <div className="glass-card">
              {activeTab === 'consolidated' ? (
                activeClassData ? (
                  <div className="consolidated-tab-wrapper">
                    <div className="preview-header">
                      <div>
                        <h2 style={{ fontSize: '20px' }}>Subject Consolidated Report</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                          Showing all students for class <strong>{selectedClass}</strong> with target and selected exams.
                        </p>
                      </div>
                      <div className="preview-actions">
                        <button className="btn btn-primary" onClick={handlePrint} style={{ width: 'auto' }}>
                          🖨️ Print Report
                        </button>
                      </div>
                    </div>
                    <div className="consolidated-report-body">
                      <ClassConsolidatedReport
                        classData={activeClassData}
                        selectedExams={consolidatedExams.filter(e => e !== '')}
                        showSubjectAverage={showConsolidatedSubjectAverage}
                        schoolName={schoolName}
                        logoUrl={logoUrl}
                        academicYear={academicYear}
                      />
                    </div>
                  </div>
                ) : null
              ) : activeTab === 'preview' ? (
                selectedStudent && activeClassData ? (
                  <div className="report-card-container">
<ReportCard 
                        student={selectedStudent} 
                        classData={activeClassData} 
                        selectedWts={selectedWts} 
                        selectedMts={selectedMts} 
                        selectedCpts={selectedCpts}
                        selectedSpts={selectedSpts}
                        selectedOthers={selectedOthers}
                        selectedExamsByType={selectedExamsByType}
                        graphExamType={graphExamType}
                        selectedGraphExams={selectedGraphExams}
                        avgExamMode={avgExamMode}
                        selectedAvgExams={selectedAvgExams}
                        sectionOrder={sectionOrder}
                        logoUrl={logoUrl} 
                        schoolName={schoolName}
                        academicYear={academicYear}
                        reportDate={reportDate}
                        showExamsWithoutAveraging={showExamsWithoutAveraging}
                      />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>No student records found in sheet.</div>
                )
              ) : (
                activeClassData ? (
                  <div className="batch-container">
                    <div className="preview-header" style={{ width: '100%' }}>
                      <div>
                        <h2 style={{ fontSize: '20px' }}>Class Batch Report Generation</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                          {isCacmaClass
                            ? <>Previewing all student reports for class <strong>{selectedClass}</strong>. Two reports are printed per A4 sheet (A5 size each) — cut the A4 in half after printing.</>
                            : <>Previewing all student reports for class <strong>{selectedClass}</strong>. Pressing Print will print all reports sequentially (with A4 page breaks).</>}
                        </p>
                      </div>
                      <div className="preview-actions">
                        <button className="btn btn-primary" onClick={handlePrint} style={{ width: 'auto' }}>
                          🖨️ Print All Cards
                        </button>
                        <button id="btn-batch-download-pdf" className="btn btn-secondary" onClick={handleBatchDownloadPdf} style={{ width: 'auto' }}>
                          📄 Download PDF
                        </button>
                      </div>
                    </div>

                    {isCacmaClass ? (
                      pairStudents(activeClassData.students).map((pair, index) => (
                        <div className="cacma-sheet" key={`sheet-${index}`}>
                          {[0, 1].map(slot => (
                            pair[slot] ? (
                              <div className="cacma-report" key={pair[slot].sno}>
                                <ReportCard 
                                  student={pair[slot]} 
                                  classData={activeClassData} 
                                  selectedWts={selectedWts} 
                                  selectedMts={selectedMts} 
                                  selectedCpts={selectedCpts}
                                  selectedSpts={selectedSpts}
                                  selectedOthers={selectedOthers}
                                  selectedExamsByType={selectedExamsByType}
                                  graphExamType={graphExamType}
                                  selectedGraphExams={selectedGraphExams}
                                  avgExamMode={avgExamMode}
                                  selectedAvgExams={selectedAvgExams}
                                  sectionOrder={sectionOrder}
                                  logoUrl={logoUrl} 
                                  schoolName={schoolName}
                                  academicYear={academicYear}
                                  reportDate={reportDate}
                                />
                              </div>
                            ) : (
                              <div className="cacma-report" key={`empty-${index}-${slot}`} />
                            )
                          ))}
                        </div>
                      ))
                    ) : (
                      activeClassData.students.map(student => (
                        <ReportCard 
                          key={student.sno}
                          student={student} 
                          classData={activeClassData} 
                          selectedWts={selectedWts} 
                          selectedMts={selectedMts} 
                          selectedCpts={selectedCpts} 
                          selectedSpts={selectedSpts}
                          selectedOthers={selectedOthers}
                          selectedExamsByType={selectedExamsByType}
                          graphExamType={graphExamType}
                          selectedGraphExams={selectedGraphExams}
                          avgExamMode={avgExamMode}
                          selectedAvgExams={selectedAvgExams}
                          sectionOrder={sectionOrder}
                          logoUrl={logoUrl} 
                          schoolName={schoolName}
                          academicYear={academicYear}
                          reportDate={reportDate}
                        />
                      ))
                    )}
                  </div>
                ) : null
              )}
            </div>
          </>
        ) : (
          /* Empty / Welcome State */
          <div className="glass-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state">
              <span className="empty-state-icon">🎓</span>
              <h1 className="empty-state-title">Student Progress Reports</h1>
              <p className="empty-state-desc">
                Welcome to the Progress Reports Dashboard! To generate beautiful student card profiles:
                <br />
                1. <strong>Upload your class marks Excel sheet</strong> using the sidebar.
                <br />
                2. Select classes, customize your school name and logo.
                <br />
                3. Choose Weekly & Monthly Tests, then Print or Export high-quality reports.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="btn btn-primary" onClick={() => document.getElementById('excel-file').click()} style={{ width: 'auto', padding: '12px 24px' }}>
                  📁 Upload Marks File
                </button>
                <button className="btn btn-secondary" onClick={handleLoadDemoData} style={{ width: 'auto', padding: '12px 24px' }}>
                  ⚡ Load Demo Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
