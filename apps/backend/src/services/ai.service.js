const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateReport(data) {
  const prompt = `
You are a business analyst AI.

Analyze the following data:
- Revenue: ${data.revenue}
- Orders: ${data.orders}
- Delivery Success: ${data.deliverySuccess}%
- Top Product: ${data.topProduct}

Generate:
1. Summary (short)
2. Problem (if any)
3. Suggestion (actionable)

Respond in Bengali.
  `;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a business analyst." },
        { role: "user", content: prompt }
      ]
    });

    return res.choices[0].message.content;
  } catch (error) {
    console.error("AI Report Error:", error);
    return "AI report generation failed.";
  }
}

module.exports = {
  generateReport,
};