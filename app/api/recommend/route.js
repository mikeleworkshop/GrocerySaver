import { NextResponse } from "next/server";

export async function POST(request) {
  const { dish, groceryList } = await request.json();

  if (!dish) {
    return NextResponse.json({ error: "No dish provided" }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const systemPrompt = `You are a grocery assistant for students in Australia.
When given a dish name, respond ONLY with a JSON array of ingredients needed.
Each ingredient must have: name (string), quantity (number), unit (string like "g", "ml", "units", "tbsp"), budget_tip (string or null).
Example: [{"name":"pasta","quantity":400,"unit":"g","budget_tip":"Home brand saves ~$2"},{"name":"egg","quantity":2,"unit":"units","budget_tip":null}]
Respond with ONLY the JSON array. No explanation, no markdown, no backticks.`;

  const userPrompt = groceryList?.length
    ? `I want to make: ${dish}. I already have: ${groceryList
        .map((i) => i.name)
        .join(", ")}. What else do I need?`
    : `I want to make: ${dish}. Give me the full ingredient list.`;

  const FREE_MODELS = [
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "meta-llama/llama-3.2-3b-instruct:free",
  ];

  try {
    let lastError = "";

    for (const model of FREE_MODELS) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 500,
          }),
        }
      );

      if (response.status === 429) {
        lastError = `${model} is rate-limited`;
        console.warn(lastError, "— trying next model");
        continue;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("OpenRouter error", response.status, text);
        return NextResponse.json(
          { error: `AI error (${response.status}). Try again shortly.` },
          { status: 500 }
        );
      }

      const data = await response.json();
      const raw = data.choices[0].message.content.trim();
      const clean = raw.replace(/```json|```/g, "").trim();
      const ingredients = JSON.parse(clean);

      return NextResponse.json({ ingredients });
    }

    return NextResponse.json(
      { error: "All AI models are busy right now. Please try again in a minute." },
      { status: 429 }
    );
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    return NextResponse.json(
      { error: "Failed to reach AI provider" },
      { status: 500 }
    );
  }
}