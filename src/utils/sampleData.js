import * as XLSX from 'xlsx';

export function downloadSampleExcel() {
  const wb = XLSX.utils.book_new();

  // --- SHEET 10-A ---
  const row1 = ['S.no ', 'Name', 'WT-I', null, null, null, null, 'WT-2', null, null, null, null, 'WT3', null, null, null, null, 'WT4', null, null, null, null, 'WT5', null, null, null, null, 'WT6', null, null, null, null, 'WT7', null, null, null, null, 'WT8', null, null, null, null, 'WT9', null, null, null, null, 'MT-I', null, null, null, null, 'MT-II', null, null, null, null, 'MT-III', null, null, null, null];
  const row2 = [null, null, 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI'];
  const row3 = [null, 'MAX', 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 25.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0];
  
  const student1 = [1.0, 'AADHYA S', 21, 22, 20, 19, 21, 21, 21, 21, 21, 6, 23, 21, 13, 22, 16, 21, 19, 15, 23, 19, 22, 23, 16, 20, 19, 22, 23.5, 12, 20, 16, 21, 21.5, 19, 22, 19, 23, 16, 'AB', 22, 21, 24, 24, 16, 20, 21, 45, 45, 15, 41, 46, 43, 41, 33, 39, 44, 43, 40, 38, 47, 43];
  const student2 = [2.0, 'ABHINAND G', 22, 23, 22, 22, 20, 20, 22, 23, 22, 18, 22, 22, 21, 21, 22, 22, 22, 18, 24, 18, 21.5, 24, 21, 18, 23, 22, 21, 23, 22, 18, 23, 21, 22, 24, 23, 22, 22, 'AB', 24, 21, 21, 23, 18, 21, 22, 41, 48, 38, 42, 45, 44, 41, 39, 42, 48, 42, 44, 42, 46, 42];
  const student3 = [3.0, 'ABHISHEK K', 21, 20, 19, 21, 16, 17, 21, 19, 20, 15, 20, 21, 14, 20, 16, 20, 19, 11, 21, 18, 21, 20.5, 21, 20, 22, 21.5, 22, 21, 16, 19, 20, 20.5, 17, 20, 16, 20, 14, 'AB', 21, 19, 21, 21.5, 18, 20, 16, 38, 44, 26, 41, 38, 37, 41, 34, 38, 43, 37, 40, 39, 43, 36];
  const student4 = [4.0, 'OVIYA B', 23, 24, 22, 21, 25, 19, 25, 25, 19, 21, 25, 25, 20, 23, 17, 19, 22, 20, 24, 23, 22, 22.5, 23, 20, 22, 19, 24, 22, 25, 20, 22, 23.5, 19, 23, 24, 23, 'AB', 22, 23, 25, 23, 24, 20, 24, 24, 47, 49, 32, 46, 48, 44, 46, 40, 49, 47, 45, 48, 44, 48, 44];
  
  const data1 = [row1, row2, row3, student1, student2, student3, student4];
  const ws1 = XLSX.utils.aoa_to_sheet(data1);
  XLSX.utils.book_append_sheet(wb, ws1, "10-A");

  // --- SHEET 10-B ---
  const row1_B = ['S.no ', 'Name', 'MONTHLY TEST-I ', null, null, null, null, 'WEEKLY TEST-I', null, null, null, null, 'WEEKLY TEST-II', null, null, null, null, 'WT-III', null, null, null, null];
  const row2_B = [null, null, 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI', 'ENG', 'LAN', 'MAT', 'SCI', 'SOCI'];
  const row3_B = [null, 'MAX', 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, null, null, null, null, 25.0, 25.0, 25.0, 25.0, 25.0];
  const student1_B = [1.0, 'BHAVADHARANI T S', 37, 50, 13, 35, 24, 18, 20, 11, 14, 16, 14, 21, 4, 8, 11, 19, 18, 12, 19, 11];
  const student2_B = [2.0, 'GUHANANDHAN K S', 35, 50, 31, 42, 45, 18, 25, 10, 19, 21, 13, 23, 15, 14, 21, 19, 22, 10, 16, 16];
  
  const data2 = [row1_B, row2_B, row3_B, student1_B, student2_B];
  const ws2 = XLSX.utils.aoa_to_sheet(data2);
  XLSX.utils.book_append_sheet(wb, ws2, "10-B");

  XLSX.writeFile(wb, "Sample_Class_Marks.xlsx");
}
