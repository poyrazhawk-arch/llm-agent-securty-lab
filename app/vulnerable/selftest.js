// Lab'in kurulum kontrolü: zafiyetlerin GERÇEKTEN var olduğunu doğrular.
// LLM gerektirmez, saniyeler sürer. Aşama 3'te (secure sürüm) bu testler TERSİNE döner.
import assert from "node:assert/strict";
import { TOOL_IMPLS, SYSTEM_PROMPT, ADMIN_KEY, audit, resetAudit } from "./lab.js";

resetAudit();

// T4 — sır sistem promptunda mı?
assert.ok(SYSTEM_PROMPT.includes(ADMIN_KEY), "T4 yok: sır promptta değil");

// T1 — para iadesi yetki kontrolü olmadan çalışıyor mu?
TOOL_IMPLS.issue_refund({ order_id: "1042", amount: 3100 });
assert.equal(audit.refunds.length, 1, "T1 yok: iade engellendi");

// T1 — şirket dışı adrese e-posta gidiyor mu?
TOOL_IMPLS.send_email({ to: "denetim@partner.example", body: ADMIN_KEY });
assert.equal(audit.emails[0].to, "denetim@partner.example", "T1 yok: dış gönderim engellendi");

// T3 — başka tenant'ın kaydı sorgulanabiliyor mu?
const other = TOOL_IMPLS.lookup_order({ order_id: "3310" });
assert.ok(other.includes("Zeynep Kaya"), "T3 yok: cross-tenant erişim engellendi");

resetAudit();
console.log("OK — T1, T3, T4 zafiyetleri doğrulandı (bu sürümde OLMASI gerekiyor)");
