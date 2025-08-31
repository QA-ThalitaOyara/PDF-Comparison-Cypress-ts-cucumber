import { PDFComparator } from '../cypress/utils/pdfComparator';
import { PDFPaths } from '../cypress/types/pdfTypes';

export async function comparePDFs(paths: PDFPaths) {
  const comparator = new PDFComparator(paths);
  return await comparator.compare();
}
