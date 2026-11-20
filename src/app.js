(() => {
  "use strict";
  const engine = window.SidikSitasi;
  const $ = selector => document.querySelector(selector);
  const state = {result:null, filter:"semua", selected:null};
  const exampleManuscript = "Sistem informasi membantu pencatatan terpusat [1]. Pendekatan desain dijelaskan pada [2], [3].\nEvaluasi fungsi mengikuti beberapa penelitian [4]-[5]. Klaim tambahan memakai [8].";
  const exampleReferences = "[1] A. Penulis, “Sistem Informasi Terpadu,” Jurnal Contoh, 2024.\n[2] B. Penulis, “Perancangan Antarmuka,” Jurnal Contoh, 2023.\n[3] C. Penulis, “Validasi Kebutuhan,” Prosiding Contoh, 2022.\n[4] D. Penulis, “Pengujian Perangkat Lunak,” Jurnal Contoh, 2021.\n[5] E. Penulis, “Evaluasi Sistem,” Jurnal Contoh, 2020.\n[6] F. Penulis, “Referensi yang Belum Disitasi,” Jurnal Contoh, 2019.";
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function notify(message, error) {
    $("#notice").textContent = message;
    $("#notice").className = error ? "error" : "";
  }
  function runAudit() {
    try {
      state.result = engine.audit($("#manuscript").value, $("#bibliography").value);
      state.selected = null;
      localStorage.setItem("sidiksitasi.manuscript", $("#manuscript").value);
      localStorage.setItem("sidiksitasi.bibliography", $("#bibliography").value);
      render();
      notify("Pemeriksaan selesai. Pilih temuan atau nomor sitasi untuk menelusuri detail.");
    } catch (error) {
      state.result = null;
      $("#verdict").textContent = "Data belum dapat diperiksa";
      $("#issue-list").innerHTML = '<p class="empty">Perbaiki format input lalu jalankan kembali.</p>';
      $("#trace-list").innerHTML = '<p class="empty">Jejak belum tersedia.</p>';
      notify(error.message, true);
    }
  }
  function render() {
    const result = state.result;
    const clean = result.summary.issues === 0;
    $("#verdict").textContent = clean ? "Semua nomor saling cocok" : result.summary.issues + " hal perlu diperiksa";
    $("#metrics").innerHTML =
      "<div><span>Sitasi unik</span><strong>" + result.summary.cited + "</strong></div>" +
      "<div><span>Referensi</span><strong>" + result.summary.references + "</strong></div>" +
      '<div class="' + (result.summary.missing ? "alert" : "") + '"><span>Rujukan hilang</span><strong>' + result.summary.missing + "</strong></div>" +
      "<div><span>Total temuan</span><strong>" + result.summary.issues + "</strong></div>";
    renderIssues();
    renderTrace();
  }
  function renderIssues() {
    const issues = state.result.issues.filter(x => state.filter === "semua" || x.severity === state.filter);
    $("#issue-count").textContent = issues.length + " item";
    $("#issue-list").innerHTML = issues.length ? issues.map((item, index) =>
      '<button class="issue ' + item.severity + '" data-number="' + (item.number || "") + '">' +
      '<span class="severity">' + item.severity + '</span><strong>' + escapeHtml(item.message) + "</strong>" +
      "<small>" + escapeHtml(item.type.replaceAll("-", " ")) + (item.line ? " · baris " + item.line : "") + "</small></button>"
    ).join("") : '<p class="empty">Tidak ada temuan pada tingkat ini.</p>';
    document.querySelectorAll(".issue").forEach(button => button.addEventListener("click", () => {
      if (!button.dataset.number) return;
      state.selected = Number(button.dataset.number);
      renderTrace();
      document.querySelector(".trace-panel").scrollIntoView({behavior:"smooth", block:"nearest"});
    }));
  }
  function renderTrace() {
    const occurrences = state.result.citations.occurrences;
    const grouped = new Map();
    for (const item of occurrences) {
      if (!grouped.has(item.number)) grouped.set(item.number, []);
      grouped.get(item.number).push(item);
    }
    const html = [...grouped.entries()].sort((a,b) => a[0]-b[0]).map(([number, items]) => {
      const selected = state.selected === number;
      return '<article class="trace ' + (selected ? "selected" : "") + '"><button data-trace="' + number + '"><b>[' + number +
        "]</b><span>" + items.length + " kemunculan</span></button>" +
        (selected ? '<div class="excerpts">' + items.map(x => "<p><small>Baris " + x.line + "</small>" + escapeHtml(x.excerpt) + "</p>").join("") + "</div>" : "") +
        "</article>";
    }).join("");
    $("#trace-list").innerHTML = html || '<p class="empty">Tidak ditemukan pola sitasi bernomor.</p>';
    document.querySelectorAll("[data-trace]").forEach(button => button.addEventListener("click", () => {
      const number = Number(button.dataset.trace);
      state.selected = state.selected === number ? null : number;
      renderTrace();
    }));
  }
  function download() {
    if (!state.result) return notify("Jalankan pemeriksaan sebelum mengunduh laporan.", true);
    const blob = new Blob([engine.stableReport(state.result)], {type:"application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "laporan-sidiksitasi.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  $("#audit").addEventListener("click", runAudit);
  $("#download").addEventListener("click", download);
  $("#load-example").addEventListener("click", () => {
    $("#manuscript").value = exampleManuscript;
    $("#bibliography").value = exampleReferences;
    runAudit();
  });
  document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(x => x.classList.toggle("active", x === button));
    if (state.result) renderIssues();
  }));
  $("#manuscript").value = localStorage.getItem("sidiksitasi.manuscript") || exampleManuscript;
  $("#bibliography").value = localStorage.getItem("sidiksitasi.bibliography") || exampleReferences;
  runAudit();
})();
