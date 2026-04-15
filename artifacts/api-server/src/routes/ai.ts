/**
 * Groq AI Health Assistant route — Smart Inhaler Monitor.
 *
 * Provides a conversational AI assistant powered by Groq's LLM (llama-3.3-70b-versatile).
 * The assistant is given real-time context about the patient's usage data so it can
 * give personalised, data-aware responses.
 *
 * The GROQ_APIKEY is stored server-side only — never exposed to the frontend.
 *
 * Routes:
 *   POST /api/ai/chat  — Send a message and receive an AI response
 */
import { Router, type IRouter, type Request, type Response } from "express";
import Groq from "groq-sdk";
import { desc, gte } from "drizzle-orm";
import { db, inhalerUsageTable, alertsTable } from "@workspace/db";

const router: IRouter = Router();

// Groq client is lazily initialised on first request so the .env
// has already been loaded by the time the constructor runs
let _groq: Groq | null = null;
function getGroq(): Groq {
    if (!_groq) {
        const apiKey = process.env.GROQ_API_KEY ?? process.env.GROQ_APIKEY ?? "";
        _groq = new Groq({ apiKey });
    }
    return _groq;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the system prompt injected before every conversation.
 * Includes live patient data so the LLM can give personalised advice.
 */
function buildSystemPrompt(context: {
    totalToday: number;
    lastUsageTime: string | null;
    alertsToday: number;
    recentAlertTypes: string[];
    avgWeeklyUsage: number;
    maxRiskScore: number;
}): string {
    return `You are AeroSense AI, a compassionate and knowledgeable health assistant for asthma patients using the AeroSense Smart Inhaler Monitor.

Your role:
- Help patients understand their inhaler usage patterns
- Explain what alerts mean in plain, reassuring language
- Give practical advice on inhaler technique and asthma management
- Remind patients to consult their doctor for medical decisions
- Be concise — keep responses under 150 words unless the patient asks for detail

Current patient data (today):
- Inhaler uses today: ${context.totalToday}
- Last usage: ${context.lastUsageTime ?? "Not used today"}
- Alerts triggered today: ${context.alertsToday}
- Alert types: ${context.recentAlertTypes.length > 0 ? context.recentAlertTypes.join(", ") : "None"}
- 7-day average daily usage: ${context.avgWeeklyUsage} doses/day
- Current AI risk score: ${context.maxRiskScore}/100

Risk score guide: 0–24 = Safe, 25–49 = Low risk, 50–74 = Moderate, 75–100 = High risk.

Important: You are NOT a doctor. Always recommend consulting a healthcare professional for medical decisions. Never diagnose conditions.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT FETCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches live patient data from the database to inject into the AI context.
 * Runs in parallel for performance.
 */
async function fetchPatientContext() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayUsages, todayAlerts, weekUsages] = await Promise.all([
        db.select().from(inhalerUsageTable)
            .where(gte(inhalerUsageTable.createdAt, startOfDay.toISOString()))
            .orderBy(desc(inhalerUsageTable.createdAt)),
        db.select().from(alertsTable)
            .where(gte(alertsTable.createdAt, startOfDay.toISOString())),
        db.select().from(inhalerUsageTable)
            .where(gte(inhalerUsageTable.createdAt, sevenDaysAgo.toISOString())),
    ]);

    const maxRiskScore = todayUsages.reduce((max, u) => Math.max(max, u.riskScore ?? 0), 0);
    const lastUsage = todayUsages[0];
    const lastUsageTime = lastUsage
        ? new Date(lastUsage.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : null;

    return {
        totalToday: todayUsages.length,
        lastUsageTime,
        alertsToday: todayAlerts.length,
        recentAlertTypes: [...new Set(todayAlerts.map((a) => a.type))],
        avgWeeklyUsage: Math.round((weekUsages.length / 7) * 10) / 10,
        maxRiskScore,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /ai/chat
 *
 * Accepts a conversation history and returns an AI-generated response.
 *
 * Request body:
 *   {
 *     messages: Array<{ role: "user" | "assistant", content: string }>
 *   }
 *
 * Response:
 *   { reply: string }
 */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
    try {
        const { messages } = req.body as {
            messages: Array<{ role: "user" | "assistant"; content: string }>;
        };

        if (!Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ error: "messages array is required" });
            return;
        }

        // Validate message structure
        const validRoles = new Set(["user", "assistant"]);
        const isValid = messages.every(
            (m) => validRoles.has(m.role) && typeof m.content === "string" && m.content.trim().length > 0,
        );
        if (!isValid) {
            res.status(400).json({ error: "Each message must have role (user|assistant) and non-empty content" });
            return;
        }

        // Fetch live patient context to personalise the AI response
        const context = await fetchPatientContext();
        const systemPrompt = buildSystemPrompt(context);

        // Call Groq API with the conversation history
        const completion = await getGroq().chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages,
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        const reply = completion.choices[0]?.message?.content?.trim() ?? "I'm sorry, I couldn't generate a response. Please try again.";

        req.log.info({ messageCount: messages.length }, "AI chat response generated");
        res.json({ reply });
    } catch (error: unknown) {
        req.log.error({ error }, "Groq AI chat failed");

        // Surface Groq API errors clearly
        if (error instanceof Error && error.message.includes("401")) {
            res.status(500).json({ error: "AI service authentication failed. Check GROQ_APIKEY." });
            return;
        }
        res.status(500).json({ error: "AI assistant is temporarily unavailable. Please try again." });
    }
});

export default router;
