// Run with: node test-openrouter.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;

if (!OPEN_ROUTER_API_KEY) {
  console.error("OPEN_ROUTER_API_KEY environment variable is required");
  console.error(
    "Make sure you have a .env.local file with OPEN_ROUTER_API_KEY=your_key_here"
  );
  process.exit(1);
}

console.log(
  "✅ OPEN_ROUTER_API_KEY found:",
  OPEN_ROUTER_API_KEY.substring(0, 10) + "..."
);

async function testOpenRouter() {
  try {
    console.log("\n🧪 Testing OpenRouter API...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPEN_ROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nexus-tech.vercel.app",
          "X-Title": "Nexus Tech",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: "Hello! Can you tell me a short joke?",
            },
          ],
          temperature: 0.7,
          max_tokens: 100,
          stream: false,
        }),
      }
    );

    console.log("📡 Response status:", response.status);
    console.log(
      "📡 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      return;
    }

    const data = await response.json();
    console.log("📄 Raw response:", JSON.stringify(data, null, 2));

    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;
      console.log("🤖 AI Response:", message.content);

      if (data.usage) {
        console.log("📊 Usage:", data.usage);
      }

      console.log("✅ OpenRouter API test successful!");
    } else {
      console.error("❌ No response generated");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testOpenRouter().catch(console.error);
