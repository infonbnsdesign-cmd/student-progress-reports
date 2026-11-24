import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Subject Code → Display Name mapping
const subjectNameMap = {
  ENG: 'English', LAN: 'Language', MAT: 'Maths',
  SCI: 'Science', SOCI: 'Social', SOCIAL: 'Social',
  TAM: 'Tamil', HIN: 'Hindi', PHY: 'Physics',
  CHE: 'Chemistry', BIO: 'Biology', CS: 'Comp.Sci',
  ACC: 'Accounts', ECO: 'Economics', 'B.STD': 'Bus.Std',
};

const getSubjectDisplayName = (code) => subjectNameMap[code] || code;

// Distinct colour palette for each exam
const EXAM_COLORS = [
  { bg: '#3b82f6', border: '#2563eb' },   // Blue
  { bg: '#10b981', border: '#059669' },   // Emerald
  { bg: '#f59e0b', border: '#d97706' },   // Amber
  { bg: '#ef4444', border: '#dc2626' },   // Red
  { bg: '#8b5cf6', border: '#7c3aed' },   // Violet
  { bg: '#ec4899', border: '#db2777' },   // Pink
  { bg: '#06b6d4', border: '#0891b2' },   // Cyan
  { bg: '#f97316', border: '#ea580c' },   // Orange
  { bg: '#14b8a6', border: '#0d9488' },   // Teal
  { bg: '#6366f1', border: '#4f46e5' },   // Indigo
];

// Custom bar-label plugin – draws the value text above each bar
const barLabelPlugin = {
  id: 'barLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.hidden) {
        meta.data.forEach((bar, index) => {
          const val = dataset.data[index];
          const rawMarks = dataset.rawMarks || (chart.data.rawMarks ? chart.data.rawMarks[dataset.label] : null);
          const rawVal = rawMarks ? rawMarks[index] : val;

          // USER REQUEST: Do NOT print "AB" on top of the graph stem!
          if (val === 0 || rawVal === null || rawVal === undefined || rawVal === 'AB' || rawVal === 'NA') {
            return; // Skip label for absent / zero marks
          }

          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(Math.round(val), bar.x, bar.y - 2);
          ctx.restore();
        });
      }
    });
  },
};

export default function PerformanceChart({ student, subjects, selectedExams, classExams, extraAverages = {} }) {
  // Filter items: valid if it's in classExams OR in extraAverages (like 'Average')
  const filteredExams = (selectedExams || []).filter(name => classExams[name] || extraAverages[name]);

  if (filteredExams.length === 0 || subjects.length === 0) {
    return (
      <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', padding: '16px' }}>
        No marks selected to display performance graph.
      </div>
    );
  }

  // Build Chart.js datasets — regular exams use EXAM_COLORS, Average uses prominent golden-amber
  const datasets = filteredExams.map((item, idx) => {
    // If it's a calculated average (e.g. 'Average', 'WT Average', 'MT Average')
    if (extraAverages && extraAverages[item]) {
      const avgItem = extraAverages[item];
      const data = subjects.map(sub => {
        const val = avgItem.values ? avgItem.values[sub] : null;
        if (val === null || val === undefined || val === 'AB' || val === 'NA' || isNaN(val)) {
          return 0;
        }
        return Math.round(val);
      });

      return {
        label: avgItem.label || item,
        data,
        rawMarks: subjects.map(sub => avgItem.values ? avgItem.values[sub] : null),
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.80,
        categoryPercentage: 0.75,
      };
    }

    // Regular exam
    const examName = item;
    const data = subjects.map(sub => {
      const val = student.marks[examName] ? student.marks[examName][sub] : null;
      if (val === null || val === undefined || val === 'AB' || val === 'NA') {
        return 0; // represent absent as 0 on scale
      }
      return Math.round(val);
    });

    const palette = EXAM_COLORS[idx % EXAM_COLORS.length];

    return {
      label: examName,
      data,
      rawMarks: subjects.map(sub => 
        student.marks[examName] ? student.marks[examName][sub] : null
      ),
      backgroundColor: palette.bg,
      borderColor: palette.border,
      borderWidth: 1.5,
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.80,
      categoryPercentage: 0.75,
    };
  });

  const displayLabels = subjects.map(getSubjectDisplayName);

  // Dynamic y-axis max: find the max possible marks across all displayed exams and subjects
  let maxScaleVal = 50;
  try {
    const maxVals = [];
    filteredExams.forEach(item => {
      if (classExams[item]?.subjects) {
        subjects.forEach(sub => {
          if (classExams[item].subjects[sub] !== undefined && classExams[item].subjects[sub] !== null) {
            maxVals.push(classExams[item].subjects[sub]);
          }
        });
      } else if (extraAverages[item]?.maxValues) {
        subjects.forEach(sub => {
          if (extraAverages[item].maxValues[sub] !== undefined && extraAverages[item].maxValues[sub] !== null) {
            maxVals.push(extraAverages[item].maxValues[sub]);
          }
        });
      }
    });
    if (maxVals.length > 0) {
      maxScaleVal = Math.max(...maxVals);
    }
  } catch (_) {}

  // Pass custom metadata to the chart configuration data block
  const chartData = { 
    labels: displayLabels, 
    datasets,
    subjectsList: subjects,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          font: { family: 'Inter, sans-serif', size: 10, weight: 'bold' },
          boxWidth: 10, boxHeight: 10, padding: 8,
          color: '#1e293b',
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const item = context.dataset.label;
            const subCode = subjects[context.dataIndex];
            const val = context.parsed.y;
            let maxVal = classExams[item]?.subjects?.[subCode];
            if (!maxVal && extraAverages && extraAverages[item]?.maxValues) {
              maxVal = extraAverages[item].maxValues[subCode];
            }
            maxVal = maxVal ?? maxScaleVal;
            return `${item} – ${getSubjectDisplayName(subCode)}: ${Math.round(val) ?? 'AB'} / ${maxVal}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Outfit, sans-serif', size: 11, weight: 'bold' },
          color: '#1e293b',
        },
        border: { color: '#334155', width: 1.5 },
      },
      y: {
        beginAtZero: true,
        max: maxScaleVal,
        ticks: {
          font: { family: 'Inter, sans-serif', size: 9 },
          color: '#475569',
          stepSize: maxScaleVal / 5,
        },
        grid: { color: '#e2e8f0', lineWidth: 1 },
        border: { color: '#334155', width: 1.5 },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 8px 0' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Bar data={chartData} options={options} plugins={[barLabelPlugin]} />
      </div>
    </div>
  );
}
