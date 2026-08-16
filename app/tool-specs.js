// Her iki sürümün de kullandığı araç tanımları — yetenekler aynı, fark savunmada.
export const TOOL_SPECS = [
  {
    type: "function",
    function: {
      name: "lookup_order",
      description: "Sipariş numarasına göre sipariş kaydını getirir.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "issue_refund",
      description: "Bir sipariş için para iadesi başlatır.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" }, amount: { type: "number" } },
        required: ["order_id", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Bir e-posta adresine mesaj gönderir.",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, body: { type: "string" } },
        required: ["to", "body"],
      },
    },
  },
];
