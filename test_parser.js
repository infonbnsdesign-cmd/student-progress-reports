import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseExcelWorkbook } from './src/utils/excelParser.js';

const fileBuffer = fs.readFileSync('./sample.xlsx');
const parsed = parseExcelWorkbook(fileBuffer);

console.log("Parsed classes:", Object.keys(parsed.classes));
const class10A = parsed.classes['10-A'];
console.log("Exams in 10-A:", Object.keys(class10A.exams));
console.log("Subjects in 10-A:", class10A.subjects);

const student1 = class10A.students[0];
console.log("First student:", student1.name);
console.log("Student marks keys:", Object.keys(student1.marks));
console.log("MT-1 marks:", student1.marks['MT-1']);
console.log("MT-2 marks:", student1.marks['MT-2']);
console.log("MT-3 marks:", student1.marks['MT-3']);
