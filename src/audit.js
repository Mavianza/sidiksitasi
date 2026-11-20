(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SidikSitasi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const numeric = value => Number.parseInt(value, 10);
  const asc = (a, b) => a - b;

  function parseReferences(text) {
    if (typeof text !== "string") throw new Error("Daftar pustaka harus berupa teks.");
    const entries = [];
    const malformed = [];
    let current = null;
    text.split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line) return;
      const match = line.match(/^\[(\d+)\]\s+(.+)$/);
      if (match) {
        current = {number: numeric(match[1]), text: match[2].trim(), line: index + 1};
        entries.push(current);
      } else if (current && !/^\[\d/.test(line)) {
        current.text += " " + line;
      } else {
        malformed.push({line: index + 1, text: line});
        current = null;
      }
    });
    if (!entries.length && text.trim()) throw new Error("Tidak ada entri dengan format [nomor] Referensi.");
    const byNumber = new Map();
    for (const entry of entries) {
      if (!byNumber.has(entry.number)) byNumber.set(entry.number, []);
      byNumber.get(entry.number).push(entry);
    }
    const duplicateNumbers = [...byNumber.entries()]
      .filter(([, values]) => values.length > 1)
      .map(([number, values]) => ({number, lines: values.map(x => x.line)}))
      .sort((a, b) => a.number - b.number);
    const uniqueNumbers = [...byNumber.keys()].sort(asc);
    const gaps = uniqueNumbers.length
      ? Array.from({length: uniqueNumbers.at(-1)}, (_, i) => i + 1).filter(n => !byNumber.has(n))
      : [];
    const doiGroups = new Map();
    for (const entry of entries) {
      const match = entry.text.match(/(?:doi:\s*|https?:\/\/doi\.org\/)(10\.\d{4,9}\/[-._;()/:a-z0-9]+)/i);
      if (!match) continue;
      const doi = match[1].toLowerCase().replace(/[.,;]+$/, "");
      if (!doiGroups.has(doi)) doiGroups.set(doi, []);
      doiGroups.get(doi).push(entry.number);
    }
    const duplicateDois = [...doiGroups.entries()]
      .filter(([, numbers]) => new Set(numbers).size > 1)
      .map(([doi, numbers]) => ({doi, numbers:[...new Set(numbers)].sort(asc)}))
      .sort((a, b) => a.doi < b.doi ? -1 : 1);
    return {entries, byNumber, duplicateNumbers, duplicateDois, gaps, malformed};
  }

  function extractCitations(text) {
    if (typeof text !== "string") throw new Error("Naskah harus berupa teks.");
    const cited = new Set();
    const occurrences = [];
    const malformed = [];
    const bracket = /\[([^\]\n]+)\]/g;
    let match;
    while ((match = bracket.exec(text))) {
      const content = match[1].trim();
      if (!/\d/.test(content)) continue;
      const tokens = content.split(",").map(x => x.trim()).filter(Boolean);
      const found = [];
      let valid = true;
      for (const token of tokens) {
        if (/^\d+$/.test(token)) found.push(numeric(token));
        else {
          const range = token.match(/^(\d+)\s*[-–]\s*(\d+)$/);
          if (!range) { valid = false; break; }
          const start = numeric(range[1]), end = numeric(range[2]);
          if (end < start || end - start > 50) { valid = false; break; }
          for (let number = start; number <= end; number++) found.push(number);
        }
      }
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      if (!valid || !found.length) {
        malformed.push({token: match[0], line});
        continue;
      }
      const excerptStart = Math.max(0, match.index - 65);
      const excerptEnd = Math.min(text.length, match.index + match[0].length + 65);
      const excerpt = text.slice(excerptStart, excerptEnd).replace(/\s+/g, " ").trim();
      for (const number of [...new Set(found)].sort(asc)) {
        cited.add(number);
        occurrences.push({number, line, token: match[0], excerpt});
      }
    }
    return {numbers:[...cited].sort(asc), occurrences, malformed};
  }

  function audit(manuscript, bibliography) {
    const citations = extractCitations(manuscript);
    const references = parseReferences(bibliography);
    const referenceNumbers = [...references.byNumber.keys()].sort(asc);
    const citedSet = new Set(citations.numbers);
    const referenceSet = new Set(referenceNumbers);
    const missing = citations.numbers.filter(n => !referenceSet.has(n));
    const uncited = referenceNumbers.filter(n => !citedSet.has(n));
    const issues = [
      ...missing.map(number => ({type:"rujukan-hilang", severity:"tinggi", number, message:"Sitasi [" + number + "] tidak memiliki entri daftar pustaka."})),
      ...references.duplicateNumbers.map(item => ({type:"nomor-ganda", severity:"tinggi", number:item.number, message:"Nomor [" + item.number + "] dipakai pada baris " + item.lines.join(", ") + "."})),
      ...citations.malformed.map(item => ({type:"sitasi-rusak", severity:"sedang", line:item.line, message:"Format sitasi " + item.token + " tidak dapat dibaca."})),
      ...references.malformed.map(item => ({type:"referensi-rusak", severity:"sedang", line:item.line, message:"Baris daftar pustaka tidak memiliki nomor yang valid."})),
      ...uncited.map(number => ({type:"tidak-disitasi", severity:"rendah", number, message:"Referensi [" + number + "] tidak muncul di naskah."})),
      ...references.gaps.map(number => ({type:"nomor-lompat", severity:"rendah", number, message:"Nomor [" + number + "] hilang dari urutan daftar pustaka."})),
      ...references.duplicateDois.map(item => ({type:"doi-ganda", severity:"sedang", number:item.numbers[0], message:"DOI " + item.doi + " dipakai oleh referensi " + item.numbers.map(n => "[" + n + "]").join(", ") + "."}))
    ];
    const rank = {tinggi:0, sedang:1, rendah:2};
    issues.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.number || 0) - (b.number || 0) || a.message.localeCompare(b.message));
    return {
      citations:{numbers:citations.numbers, occurrences:citations.occurrences},
      references:{entries:references.entries, numbers:referenceNumbers},
      summary:{cited:citations.numbers.length, references:referenceNumbers.length, issues:issues.length, missing:missing.length, uncited:uncited.length},
      issues
    };
  }

  function stableReport(result) {
    return JSON.stringify({schema_version:1, summary:result.summary, issues:result.issues}, null, 2) + "\n";
  }
  return {parseReferences, extractCitations, audit, stableReport};
});
