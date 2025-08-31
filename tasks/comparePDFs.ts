import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createCanvas } from 'canvas';
import * as pdfjsLib from 'pdfjs-dist-legacy';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { diffLines } from 'diff';

async function extractText(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);
  const content = await pdfParse(data);
  return content.text.replace(/\s+/g, ' ').trim();
}

async function extractMetadata(filePath: string): Promise<Record<string, any>> {
  const data = fs.readFileSync(filePath);
  const content = await pdfParse(data);
  return content.info;
}

function deepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

async function renderPDFToImages(filePath: string, width = 1000, height = 1414): Promise<Buffer[]> {
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



async function compareImages(img1: Buffer, img2: Buffer, outputPath: string): Promise<boolean> {
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
    diffColor: [255, 0, 0],    // vermelho vivo para diferenças
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

function saveTextDiff(baseText: string, compareText: string, filePath: string) {
  const diff = diffLines(baseText, compareText);

  // Filtra somente as partes que foram adicionadas ou removidas
  const filteredDiff = diff.filter(part => part.added || part.removed);

  // Monta o resultado com prefixos + para adicionados e - para removidos
  const result = filteredDiff.map(part => {
    const prefix = part.added ? '+ ' : '- ';
    // O part.value pode conter múltiplas linhas, então vamos prefixar cada linha
    return part.value
      .split('\n')
      .filter(line => line.trim() !== '') // remove linhas vazias para limpar output
      .map(line => prefix + line)
      .join('\n');
  }).join('\n');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, result, 'utf-8');
}



function saveMetadataDiff(baseMeta: any, compareMeta: any, filePath: string) {
  const base = JSON.stringify(baseMeta, null, 2);
  const compare = JSON.stringify(compareMeta, null, 2);

  if (base !== compare) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `Base Metadata:\n${base}\n\nCompared Metadata:\n${compare}`, 'utf-8');
  }
}

export async function comparePDFs({
  base,
  compare,
}: {
  base: string;
  compare: string;
}) {
  try {
    const [baseText, compareText] = await Promise.all([
      extractText(base),
      extractText(compare),
    ]);

    const [baseMeta, compareMeta] = await Promise.all([
      extractMetadata(base),
      extractMetadata(compare),
    ]);

    const textMatch = baseText === compareText;
    const metaMatch = deepEqual(baseMeta, compareMeta);

    const [baseImgs, compareImgs] = await Promise.all([
      renderPDFToImages(base),
      renderPDFToImages(compare),
    ]);

    const numPages = Math.min(baseImgs.length, compareImgs.length);
    let visualMatch = true;
    const diffPaths: string[] = [];

    for (let i = 0; i < numPages; i++) {
      const diffImagePath = path.resolve(`pdfs/diff/visual-diff-page-${i + 1}.png`);
      const match = await compareImages(baseImgs[i], compareImgs[i], diffImagePath);

      if (!match) {
        visualMatch = false;
        diffPaths.push(diffImagePath);
        console.log(`❌ Diferença visual na página ${i + 1}. Veja: ${diffImagePath}`);
      }
    }

    // Texto e metadados
    if (!textMatch) {
      console.log('❌ Texto diferente nos arquivos PDF.');
      saveTextDiff(baseText, compareText, path.resolve('pdfs/diff/text-diff.txt'));
    }

    if (!metaMatch) {
      console.log('❌ Metadados diferentes nos arquivos PDF.');
      saveMetadataDiff(baseMeta, compareMeta, path.resolve('pdfs/diff/meta-diff.json'));
    }

    return {
      pass: textMatch && metaMatch && visualMatch,
      textMatch,
      metaMatch,
      visualMatch,
      diffImagePaths: visualMatch ? null : diffPaths,
      textDiffPath: textMatch ? null : 'pdfs/diff/text-diff.txt',
      metaDiffPath: metaMatch ? null : 'pdfs/diff/meta-diff.json',
    };
  } catch (error) {
    console.error('Erro na comparação de PDFs:', error);
    return { pass: false, error: error.message };
  }
}
