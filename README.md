# SidikSitasi

SidikSitasi adalah aplikasi web lokal untuk mencocokkan sitasi IEEE bernomor di dalam naskah dengan daftar pustaka. Aplikasi ini membantu menemukan rujukan yang hilang, referensi yang tidak pernah disitasi, nomor ganda, nomor lompat, DOI ganda, dan format rusak sebelum naskah dikirim.

## Fitur utama

- membaca sitasi tunggal, gabungan, dan rentang seperti \`[1]\`, \`[2, 4]\`, dan \`[5]-[8]\`
- mencocokkan sitasi dengan daftar pustaka bernomor
- dashboard masalah berdasarkan tingkat tinggi, sedang, dan rendah
- penelusuran nomor sitasi sampai ke baris dan cuplikan naskah
- ekspor laporan JSON yang stabil dan mudah diolah kembali
- penyimpanan input terakhir di browser tanpa mengirim naskah ke server

## Menjalankan

Tidak ada dependensi produksi atau proses build.

~~~bash
python3 -m http.server 8080
~~~

Buka <http://localhost:8080>. Aplikasi juga dapat dibuka langsung melalui \`index.html\`, tetapi server lokal memberi perilaku yang lebih konsisten.

Untuk pengujian:

~~~bash
npm test
~~~

## Format input

Naskah dapat berupa teks biasa:

~~~text
Metode ini mengikuti penelitian sebelumnya [1], [3]-[5].
~~~

Setiap entri daftar pustaka harus dimulai dengan nomor:

~~~text
[1] A. Penulis, “Judul Artikel,” Nama Jurnal, 2024.
~~~

Baris lanjutan tanpa nomor digabungkan ke entri sebelumnya. Teks dalam kurung siku yang tidak mengandung angka diabaikan.

## Jaminan perilaku

Untuk input yang sama, laporan JSON selalu mempunyai urutan yang sama. Nomor sitasi dan referensi dinormalisasi secara numerik sebelum dibandingkan. Pemeriksa tidak membuat sitasi dari rentang terbalik, rentang lebih dari 50 nomor, atau token campuran yang tidak dipahami.

Jaminan tersebut dibuktikan oleh tes:

- alur normal dengan sitasi tunggal, gabungan, dan rentang
- rujukan hilang serta referensi yang tidak disitasi
- nomor referensi dan DOI ganda
- lokasi baris dan cuplikan naskah
- rentang terbalik, rentang ekstrem, dan format rusak
- keluaran deterministik pada eksekusi berulang
- penolakan daftar pustaka tanpa format bernomor

## Struktur proyek

- \`src/audit.js\` parser dan mesin pencocokan yang dapat diuji tanpa browser
- \`src/app.js\` state serta interaksi antarmuka
- \`index.html\` struktur aplikasi
- \`styles.css\` sistem visual responsif
- \`tests/audit.test.js\` tes integrasi dan kondisi gagal
- \`examples/\` data sintetis untuk percobaan

## Keputusan teknis dan batasan

SidikSitasi memakai JavaScript murni agar dapat berjalan offline dan mudah dipelajari. Pemrosesan dilakukan sepenuhnya di browser.

Aplikasi berfokus pada gaya IEEE bernomor. Ia tidak memeriksa kebenaran metadata bibliografi, keberadaan DOI di internet, kualitas sumber, atau kesesuaian isi klaim dengan referensi. Rentang dibatasi paling banyak 51 nomor untuk mencegah input salah menghasilkan ribuan sitasi.

## Lisensi

MIT
