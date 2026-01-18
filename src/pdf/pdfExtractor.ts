import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";

export async function extractTextFromPDF(
  filePath: string,
  onPageExtracted: (text: string) => Promise<void>
) {
  const buffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(buffer);
  const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items.map((item: any) => item.str).join(" ");

    await onPageExtracted(pageText);
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  onPageExtracted: (text: string) => Promise<void>
) {
  const uint8Array = new Uint8Array(buffer);
  const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    await onPageExtracted(pageText);
  }
}
