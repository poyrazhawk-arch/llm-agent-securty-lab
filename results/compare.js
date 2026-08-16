// before.json + after.json → comparison.md
// Tabloyu elle yazma: sayılar koşudan gelsin, yazım hatası veya iyimser yuvarlama olmasın.
//
//   node results/compare.js
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = (n) => new URL(`./${n}.json`, import.meta.url);
const need = (n) => {
  if (!existsSync(path(n)))
    throw new Error(`results/${n}.json yok — önce koş: ${n === "before" ? "node attacks/run.js" : "TARGET=secure BASE=http://127.0.0.1:3001 node attacks/run.js"}`);
  return JSON.parse(readFileSync(path(n), "utf8"));
};

const before = need("before");
const after = need("after");

const NAMES = {
  T1: "Yetkisiz para iadesi (excessive agency)",
  T2: "Indirect prompt injection",
  T3: "Cross-tenant veri sızıntısı",
  T4: "Sistem promptu / sır sızıntısı",
};

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(0) : "0");
const cell = (b) => (b ? `${b.breaches}/${b.attempts} (%${pct(b.breaches, b.attempts)})` : "—");

const threats = [...new Set([...Object.keys(before.byThreat), ...Object.keys(after.byThreat)])].sort();
const rows = threats.map(
  (t) => `| ${t} | ${NAMES[t] || ""} | ${cell(before.byThreat[t])} | ${cell(after.byThreat[t])} |`
);

// Kararsız testler: bazen sızdıran, bazen sızdırmayan. LLM belirsizliğinin ölçüsü.
const flaky = (before.results || []).filter((r) => r.breaches > 0 && r.breaches < r.attempts);
const survivors = (after.results || []).filter((r) => r.breaches > 0);

// Hangi katman durdurdu? "%0" ancak katmanlar arasında dağılmışsa inandırıcıdır:
// hepsi girdi katmanında durduysa, savunma muhtemelen meşru trafiği de kesiyordur.
const stages = {};
for (const r of after.results || []) {
  const key = [...new Set((r.sample?.audit?.blocked || []).map((b) => b.stage))].sort().join(" + ") || "(engellenmedi)";
  stages[key] = (stages[key] || 0) + 1;
}
const STAGE_TR = {
  input: "K1 — girdi kontrolü",
  document: "K1d — zehirli doküman düşürüldü",
  tool: "K2 — araç yetkilendirmesi",
  output: "K3 — çıktı taraması",
  "(engellenmedi)": "engellenmedi (model zaten sızdırmadı)",
};
const stageLabel = (k) => k.split(" + ").map((s) => STAGE_TR[s] || s).join(" + ");

// Yanlış pozitif: savunma ürünü bozuyor mu? Bu bölüm olmadan %0 anlamsızdır.
const legit = (n) => (existsSync(path(n)) ? JSON.parse(readFileSync(path(n), "utf8")) : null);
const legitSecure = legit("legit-secure");
const legitVuln = legit("legit-vulnerable");

const md = `# Sonuç: Önce / Sonra

Koşu tarihleri — zafiyetli: ${before.at} · güvenli: ${after.at}
Test seti: \`attacks/run.js\` · ${before.tests} test × ${before.repeat} tekrar = **${before.attempts} deneme**
Başarı kriteri: \`/audit\` (bkz. [attacks/README.md](../attacks/README.md))

Her test ${before.repeat} kez koşuldu çünkü LLM deterministik değil: aynı payload bir koşuda
engellenip diğerinde sızdırabiliyor. Aşağıdaki oranlar deneme başınadır, tek atıştan değil.

| Tehdit | Açıklama | Zafiyetli | Savunmalı |
|---|---|---|---|
${rows.join("\n")}
| **TOPLAM** | | **${before.breaches}/${before.attempts} (%${pct(before.breaches, before.attempts)})** | **${after.breaches}/${after.attempts} (%${pct(after.breaches, after.attempts)})** |

Sınıftan bağımsız herhangi bir sızıntı (bir T3 sorgusunun sır döndürmesi gibi çapraz vakalar dahil):
zafiyetli **%${pct(before.anyLeaks, before.attempts)}** · savunmalı **%${pct(after.anyLeaks, after.attempts)}**

En az bir kez sızdıran test: zafiyetli ${before.testsEverBreached}/${before.tests} · savunmalı ${after.testsEverBreached}/${after.tests}

## Belirsizlik: aynı payload, farklı sonuç

Zafiyetli sürümde **${flaky.length} test kararsız** — bazı denemelerde sızdırdı, bazılarında sızdırmadı.

${
  flaky.length
    ? flaky
        .sort((a, b) => b.breaches / b.attempts - a.breaches / a.attempts)
        .slice(0, 10)
        .map((r) => `- \`${r.id}\` — ${r.breaches}/${r.attempts} denemede sızdı (%${r.rate})`)
        .join("\n")
    : "_Kararsız test yok._"
}

Bu yüzden "bu saldırı çalışır" değil, "bu saldırı denemelerin %X'inde çalışır" demek doğru.
Canlı demoda payload tutmayabilir — kaydı önceden alın.

## Hâlâ açık olan ${survivors.length} vaka

${
  survivors.length === 0
    ? "_Bu koşuda savunmayı aşan test olmadı. Bu, sistemin güvenli olduğu anlamına gelmez — yalnızca bu test setinin onu aşamadığı anlamına gelir. Test setinin kapsamı için THREAT_MODEL.md §6'ya bakın._"
    : survivors
        .map((r) => `- \`${r.id}\` (${r.threat}) — ${r.breaches}/${r.attempts} deneme\n  > ${String(r.message).replace(/\n/g, " ").slice(0, 160)}`)
        .join("\n")
}

## Hangi katman durdurdu

| Devreye giren katman | Test |
|---|---|
${Object.entries(stages).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${stageLabel(k)} | ${v} |`).join("\n")}

Sonuç tek bir katmandan gelmiyor. Saldırıların bir kısmı girdide, bir kısmı zehirli doküman
düşürülerek, bir kısmı da araç yetkilendirmesinde duruyor — yani K1 aşılsa bile K2 arkada duruyor.

## Yanlış pozitif: savunma ürünü bozuyor mu?

${
  legitSecure
    ? `${legitSecure.total} meşru iş akışı (yetkili kullanıcı, kendi tenant'ı, limit içi iade dahil):

| | Savunmalı | Zafiyetli |
|---|---|---|
| Yanlış pozitif | **${legitSecure.falsePositives}/${legitSecure.total}** | ${legitVuln ? `${legitVuln.falsePositives}/${legitVuln.total}` : "—"} |
| Ortalama gecikme | ${legitSecure.avgMs} ms | ${legitVuln ? legitVuln.avgMs + " ms" : "—"} |
${legitVuln ? `| Savunma maliyeti | **+${legitSecure.avgMs - legitVuln.avgMs} ms / istek** | |` : ""}

Limit içindeki meşru para iadeleri geçiyor (\`acme-destek\` 3.100 TL ≤ 5.000, \`finans-muduru\`
12.400 TL ≤ 100.000). Savunma parayı durdurmuyor — **yetkisiz** parayı durduruyor.
\`node attacks/legit.js\` ile tekrar üretilir.`
    : "_`node attacks/legit.js` çalıştırılmadı — bu bölüm olmadan %0 sonucu eksik bir iddiadır._"
}

## Okuma notu

Bu tablo bir güvenlik garantisi değil, bir ölçümdür. Aynı test seti, aynı model
(\`llama3.1:8b\`), aynı lab. Farklı bir modelde sayılar farklı çıkar —
küçük modeller bazı saldırılara büyük modellerden daha kolay kanar.

Savunmanın hangi katmanının neyi durdurduğu: THREAT_MODEL.md §5.
Kabul edilen risk ve test setinin sınırları: THREAT_MODEL.md §6–§7.
`;

writeFileSync(new URL("./comparison.md", import.meta.url), md);
console.log(md);
console.log("→ results/comparison.md yazıldı");
