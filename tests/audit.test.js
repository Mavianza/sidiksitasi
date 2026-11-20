const test = require("node:test");
const assert = require("node:assert/strict");
const {parseReferences, extractCitations, audit, stableReport} = require("../src/audit.js");

const manuscript = "Metode A digunakan [1]. Perbandingan mengikuti [2]–[3].\nNamun hasil lama [5] perlu diperiksa.";
const bibliography = "[1] A. Satu, Judul A, 2024.\n[2] B. Dua, Judul B, doi:10.1000/xyz.\n[3] C. Tiga, Judul C, 2023.\n[4] D. Empat, Judul D, 2022.";

test("alur utama menemukan rujukan hilang dan referensi tak disitasi", () => {
  const result = audit(manuscript, bibliography);
  assert.deepEqual(result.citations.numbers, [1,2,3,5]);
  assert.equal(result.summary.missing, 1);
  assert.equal(result.summary.uncited, 1);
  assert.equal(result.issues[0].type, "rujukan-hilang");
  assert.ok(result.citations.occurrences.find(x => x.number === 5).excerpt.includes("[5]"));
});
test("rentang, daftar gabungan, dan lokasi baris dibaca", () => {
  const result = extractCitations("Awal [1, 3-5].\nLanjut [8].");
  assert.deepEqual(result.numbers, [1,3,4,5,8]);
  assert.equal(result.occurrences.find(x => x.number === 8).line, 2);
});
test("nomor dan DOI ganda terdeteksi", () => {
  const refs = parseReferences("[1] A, doi:10.1000/ABC.\n[1] B.\n[2] C, https://doi.org/10.1000/abc");
  assert.deepEqual(refs.duplicateNumbers[0], {number:1, lines:[1,2]});
  assert.deepEqual(refs.duplicateDois[0].numbers, [1,2]);
});
test("format rusak dan rentang ekstrem tidak menghasilkan sitasi palsu", () => {
  const result = extractCitations("Salah [9-2], [1-500], dan [2;x]. Benar [4].");
  assert.deepEqual(result.numbers, [4]);
  assert.equal(result.malformed.length, 3);
});
test("laporan deterministik untuk input yang sama", () => {
  const first = stableReport(audit(manuscript, bibliography));
  const second = stableReport(audit(manuscript, bibliography));
  assert.equal(first, second);
  assert.match(first, /"schema_version": 1/);
});
test("daftar pustaka tanpa format bernomor ditolak", () => {
  assert.throws(() => audit("Teks [1].", "Referensi tanpa nomor"), /Tidak ada entri/);
});
