const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackNotification(message: {
  text: string;
  blocks?: Array<Record<string, unknown>>;
}) {
  if (!SLACK_WEBHOOK_URL) {
    console.log("[Slack] No webhook URL configured, skipping:", message.text);
    return;
  }

  const res: Response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    console.error("[Slack] Failed to send:", res.status, await res.text());
  }
}

export function orderStatusNotification(
  productName: string,
  sku: string,
  fromStatus: string,
  toStatus: string,
  changedBy: string
) {
  const emoji: Record<string, string> = {
    発注済: ":package:",
    製造中: ":factory:",
    出荷済: ":ship:",
    入荷済: ":inbox_tray:",
    検品済: ":white_check_mark:",
  };

  return sendSlackNotification({
    text: `[発注ステータス] ${productName} (${sku}): ${fromStatus} → ${toStatus}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji[toStatus] || ":arrows_counterclockwise:"} *発注ステータス更新*\n*${productName}* (${sku})\n${fromStatus} → *${toStatus}*\n変更者: ${changedBy}`,
        },
      },
    ],
  });
}

export function deadlineReminderNotification(
  orders: Array<{
    productName: string;
    sku: string;
    expectedDelivery: string;
    daysUntil: number;
    supplierName: string;
  }>
) {
  if (orders.length === 0) return;

  const lines = orders
    .map(
      (o) =>
        `- *${o.productName}* (${o.sku}) | ${o.supplierName} | 納期: ${o.expectedDelivery} (あと${o.daysUntil}日)`
    )
    .join("\n");

  return sendSlackNotification({
    text: `[納期リマインダー] ${orders.length}件の発注が納期間近です`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:alarm_clock: *納期リマインダー*\n${orders.length}件の発注が7日以内に納期を迎えます:\n\n${lines}`,
        },
      },
    ],
  });
}

export function weeklySummaryNotification(summary: {
  totalRevenue: number;
  totalQuantity: number;
  criticalAlerts: number;
  warningAlerts: number;
  pendingOrders: number;
  overdueOrders: number;
}) {
  return sendSlackNotification({
    text: `[週次サマリー] 売上: ¥${summary.totalRevenue.toLocaleString()} / アラート: ${summary.criticalAlerts}件`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `:bar_chart: *週次サマリー*`,
            `売上: *¥${summary.totalRevenue.toLocaleString()}* (${summary.totalQuantity}個)`,
            `要リオーダー: *${summary.criticalAlerts}件* / 注意: ${summary.warningAlerts}件`,
            `進行中の発注: ${summary.pendingOrders}件${summary.overdueOrders > 0 ? ` | :warning: 納期超過: *${summary.overdueOrders}件*` : ""}`,
          ].join("\n"),
        },
      },
    ],
  });
}
