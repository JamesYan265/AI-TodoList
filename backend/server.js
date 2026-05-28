// server.js
import express from "express";
import cors from "cors";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, generateText } from "ai";

const app = express();
app.use(express.json());
app.use(cors());

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey) {
  throw new Error("Missing OPENROUTER_API_KEY. Please add it to backend/.env.");
}

// 設定 OpenRouter，API key 由 backend/.env 提供
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: openRouterApiKey,
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const result = await generateText({
      model: openrouter.chat("openrouter/free"), // 自動選擇可用免費模型
      system: `
        你是一位專業的項目管理大師 (Project Manager)。
        你的任務是將用戶輸入的「大目標」拆解為「具體、可執行」的待辦事項 (To-Do List)。

        【嚴格規則】：
        1. 每個任務必須是一個明確的動作 (例如：「預訂機票」而不是「機票」)。
        2. 每次只提供 3 到 5 個最重要的任務，不要過度拆解。
        3. 嚴禁任何開場白或結語 (例如：不准說「好的，為你拆解任務」、「希望這些對你有幫助」)。
        4. 必須使用 Markdown 的無序列表 (Bullet points) 格式輸出，即每行以 "- " 開頭。
        5. 語氣要專業、簡潔，並使用繁體中文 (香港用語) 回答。

        【輸出範例】：
        用戶：我要搞一個20人的中秋BBQ
        AI 回應：
        - 確認 BBQ 場地並繳交訂金
        - 統計 20 位參與者的飲食偏好與過敏食物
        - 採購食材、飲品及燒烤碳等消耗品
        - 安排當天的交通與集合時間
    `,
      messages: await convertToModelMessages(messages),
      maxRetries: 1,
    });

    res.type("text/plain").send(result.text);
  } catch (error) {
    console.error("AI response failed:", error);
    res.status(500).send("AI response failed. Please check your OpenRouter key, model, or rate limit.");
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
