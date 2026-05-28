# 🟣 NuCel Pro Tracker — Guia de Deploy

Portal de gestão de projetos do time NuCel · Nubank

---

## ⚡ Deploy no Vercel (5 minutos)

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta Nubank
2. Clique em **"Add New Project"**
3. Arraste esta pasta (ou faça upload do ZIP) na área de import
4. Clique em **"Deploy"** — o Vercel detecta automaticamente como site estático
5. Pronto! O link estará disponível em `nucel-pro-tracker.vercel.app`

---

## 📁 Estrutura de arquivos

```
nucel-pro-tracker/
├── public/
│   ├── index.html    ← HTML do portal
│   ├── style.css     ← Estilos (Nubank Brand Book 2025)
│   └── app.js        ← Lógica e dados
├── vercel.json       ← Configuração do Vercel
└── README.md         ← Este arquivo
```

---

## 🔌 Integrações (próximos passos)

Todas as integrações estão marcadas com `// 🔌 INTEGRAÇÃO` no arquivo `app.js`.

### 1. Google Sheets (dados dos projetos)

No `app.js`, substitua o array `PROJETOS` por:

```javascript
async function loadProjetos() {
  const res = await fetch("/api/projetos");
  PROJETOS = await res.json();
  renderExec();
  renderProjetos();
  buildLiderSubmenu();
}
```

Crie o arquivo `/api/projetos.js`:

```javascript
import { google } from "googleapis";

export default async function handler(req, res) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Projetos!A:P"
  });
  // mapear linhas para objetos
  const [header, ...rows] = response.data.values;
  const projetos = rows.map(row =>
    Object.fromEntries(header.map((h, i) => [h, row[i] || ""]))
  );
  res.json(projetos);
}
```

### 2. Slack (notificações)

No `app.js`, na função `sv()`, adicione após criar o projeto:

```javascript
await fetch("/api/notify-slack", {
  method: "POST",
  body: JSON.stringify({
    text: `🚀 Novo projeto criado: *${newProj.title}*\n👤 Líder: ${newProj.lider}\n📊 Métrica: ${newProj.meta} · Target: ${newProj.target}`
  })
});
```

Crie `/api/notify-slack.js`:

```javascript
export default async function handler(req, res) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: req.body.text })
  });
  res.json({ ok: true });
}
```

### 3. Databricks (métricas automáticas)

Crie `/api/sync-metrics.js` para rodar toda segunda-feira via Vercel Cron:

```javascript
import { WorkspaceClient } from "@databricks/sdk";

export default async function handler(req, res) {
  const client = new WorkspaceClient({
    host: process.env.DATABRICKS_HOST,
    token: process.env.DATABRICKS_TOKEN
  });
  // query na tabela nucel.project_metrics e atualiza a planilha
  res.json({ synced: true });
}
```

### 4. Google Calendar (agendamento de reuniões)

Adicione a Google Calendar API no mesmo projeto do Google Cloud
e configure OAuth 2.0. Consulte:
https://developers.google.com/calendar/api/v3/reference/freebusy/query

---

## 🔐 Variáveis de ambiente (Vercel Settings → Environment Variables)

| Variável                   | Valor                                    |
|---------------------------|------------------------------------------|
| `GOOGLE_SERVICE_ACCOUNT`  | JSON das credenciais da Service Account  |
| `SHEET_ID`                | ID da planilha BD Projetos               |
| `SHEET_AUDIT_ID`          | ID da planilha Audit Log                 |
| `SLACK_WEBHOOK_URL`       | URL do webhook do Slack                  |
| `DATABRICKS_HOST`         | Host do workspace Databricks             |
| `DATABRICKS_TOKEN`        | Personal Access Token do Databricks      |

---

## 📋 Planilhas no Google Drive

- **BD Projetos**: https://docs.google.com/spreadsheets/d/1MEYI1-B_mEzWEyHiDmbaTdG_nfyPgO1uxuXWwc4baf4
- **Audit Log**: https://docs.google.com/spreadsheets/d/19BCJyrIp_0pQjIVy4CA2U4PIn5xROdj9tkHq1E-K3Zo
- **Queues Databricks**: https://docs.google.com/spreadsheets/d/1-RUn9m70PIUQ3Bk2EVliXPAPPCNc-CVntPVDqIFIxQ0

---

Feito com 💜 para o time NuCel · Nubank 2025
