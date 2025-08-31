import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist-legacy';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { diffLines } from 'diff';
import { PDFPaths, ComparisonResult, PDFMetadata } from '../types/pdfTypes';

export class PDFComparator {
  private basePath: string;
  private comparePath: string;

  constructor(paths: PDFPaths) {
    this.basePath = paths.base;
    this.comparePath = paths.compare;
  }

  async compare(): Promise<ComparisonResult> {
    try {
      const [baseText, compareText] = await Promise.all([
        this.extractText(this.basePath),
        this.extractText(this.comparePath),
      ]);

      const [baseMeta, compareMeta] = await Promise.all([
        this.extractMetadata(this.basePath),
        this.extractMetadata(this.comparePath),
      ]);

      const textMatch = baseText === compareText;
      const metaMatch = this.deepEqual(baseMeta, compareMeta);

      const [baseImgs, compareImgs] = await Promise.all([
        this.renderPDFToImages(this.basePath),
        this.renderPDFToImages(this.comparePath),
      ]);

      const visualResult = await this.compareVisuals(baseImgs, compareImgs);

      // Save diffs if not matching
      if (!textMatch) {
        this.saveTextDiff(baseText, compareText);
      }
      if (!metaMatch) {
        this.saveMetadataDiff(baseMeta, compareMeta);
      }

      return {
        pass: textMatch && metaMatch && visualResult.match,
        textMatch,
        metaMatch,
        visualMatch: visualResult.match,
        diffImagePaths: visualResult.match ? null : visualResult.diffPaths,
        textDiffPath: textMatch ? null : 'pdfs/diff/text-diff.txt',
        metaDiffPath: metaMatch ? null : 'pdfs/diff/meta-diff.json',
      };
    } catch (error) {
      console.error('Erro na comparação de PDFs:', error);
      return { pass: false, textMatch: false, metaMatch: false, visualMatch: false, error: (error as Error).message };
    }
  }

  private async extractText(filePath: string): Promise<string> {
    const data = fs.readFileSync(filePath);
    const content = await pdfParse(data);
    return content.text.replace(/\s+/g, ' ').trim();
  }

  private async extractMetadata(filePath: string): Promise<PDFMetadata> {
    const data = fs.readFileSync(filePath);
    const content = await pdfParse(data);
    return content.info;
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  private async renderPDFToImages(filePath: string, width = 1000, height = 1414): Promise<Buffer[]> {
    const data = fs.readFileSync(filePath);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const images: Buffer[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as any,
        viewport: viewport,
        canvas: canvas as any,
      }).promise;

      const buffer = canvas.toBuffer('image/png');
      images.push(buffer);
    }

    return images;
  }

  private async compareVisuals(baseImgs: Buffer[], compareImgs: Buffer[]): Promise<{ match: boolean; diffPaths: string[] }> {
    const numPages = Math.min(baseImgs.length, compareImgs.length);
    let match = true;
    const diffPaths: string[] = [];

    for (let i = 0; i < numPages; i++) {
      const diffImagePath = path.resolve(`pdfs/diff/visual-diff-page-${i + 1}.png`);
      const pageMatch = await this.compareImages(baseImgs[i], compareImgs[i], diffImagePath);

      if (!pageMatch) {
        match = false;
        diffPaths.push(diffImagePath);
        console.log(`❌ Diferença visual na página ${i + 1}. Veja: ${diffImagePath}`);
      }
    }

    return { match, diffPaths };
  }

  private async compareImages(img1: Buffer, img2: Buffer, outputPath: string): Promise<boolean> {
    const image1 = PNG.sync.read(img1);
    const image2 = PNG.sync.read(img2);
    const { width, height } = image1;
    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      image1.data,
      image2.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1,
        diffColor: [255, 0, 0],
        diffMask: false
      }
    );

    if (numDiffPixels > 0) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, PNG.sync.write(diff));
      return false;
    }

    return true;
  }

  private saveTextDiff(baseText: string, compareText: string) {
    const diff = diffLines(baseText, compareText);
    const filteredDiff = diff.filter(part => part.added || part.removed);
    const result = filteredDiff.map(part => {
      const prefix = part.added ? '+ ' : '- ';
      return part.value
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => prefix + line)
        .join('\n');
    }).join('\n');

    const filePath = path.resolve('pdfs/diff/text-diff.txt');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, result, 'utf-8');
  }

  private saveMetadataDiff(baseMeta: PDFMetadata, compareMeta: PDFMetadata) {
    const base = JSON.stringify(baseMeta, null, 2);
    const compare = JSON.stringify(compareMeta, null, 2);

    if (base !== compare) {
      const filePath = path.resolve('pdfs/diff/meta-diff.json');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, `Base Metadata:\n${base}\n\nCompared Metadata:\n${compare}`, 'utf-8');
    }
  }
}
