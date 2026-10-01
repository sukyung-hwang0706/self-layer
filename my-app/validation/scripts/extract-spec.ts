// 설계서 docx에서 본문 텍스트를 뽑아 validation/spec/design-v1.txt로 저장한다.
// 원본 docx는 읽기만 한다. 외부 의존성 없이 zip 중앙 디렉터리를 직접 읽는다.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { vpath, writeText } from "./common";

const SOURCE = "../project_sources/SELF-LAYERS V1.0 검사 설계서 (85문항) (1).docx";

function readZipEntry(zip: Buffer, name: string): Buffer {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("zip 끝 레코드를 찾지 못했습니다");
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("zip 중앙 디렉터리 형식 오류");
    const method = zip.readUInt16LE(p + 10);
    const compressed = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const entry = zip.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    if (entry === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + compressed);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`지원하지 않는 압축 방식 ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${name} 항목이 없습니다`);
}

const decode = (s: string) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const xml = readZipEntry(readFileSync(SOURCE), "word/document.xml").toString("utf8");
const text = decode(xml
  .replace(/<w:tab\/>/g, "\t")
  .replace(/<w:br[^>]*\/>/g, "\n")
  .replace(/<\/w:tc>/g, " | ")
  .replace(/<\/w:tr>/g, "\n")
  .replace(/<\/w:p>/g, "\n")
  .replace(/<[^>]+>/g, ""))
  .replace(/ \| \n/g, " |\n")
  .replace(/\n{3,}/g, "\n\n");

const out = vpath("spec", "design-v1.txt");
writeText(out, `# 파생 파일: ${SOURCE}에서 추출한 텍스트 (수정 금지, 재생성: npm.cmd run validate:spec)\n\n${text.trim()}\n`);
console.log(`${out} 작성 (${text.length.toLocaleString()}자)`);
