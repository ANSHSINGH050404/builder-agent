import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import dotenv from "dotenv";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";

import cors from "cors";
dotenv.config();

import express from "express";
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === "POST") {
    console.log("Body keys:", Object.keys(req.body));
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

app.get("/models", async (req, res) => {
  try {
    // This is a bit of a hack to see what's going on
    res.json({
      message: "Check server logs for list of models (if I could list them)",
    });
  } catch (err) {
    res.status(500).json({ error: "failed" });
  }
});

app.post("/template", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    console.log(
      `[${new Date().toISOString()}] Processing /template AI request...`
    );
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Prompt: ${prompt}\n\nReturn either "node" or "react" based on what you think the project should be. Only return the name of the framework. either "node" or "react". Do not return anything extra.`,
            },
          ],
        },
      ],
    });

    const response = result.response;
    const answer = response.text().trim().toLowerCase().replace(/["']/g, "");

    if (answer.includes("react")) {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.
          \nConsider the content of ALL files in the project.\n\n
          ${reactBasePrompt}\n\nWere is a list that exist on the file system but are not being shown to you:\n\n
          - .gitignore
          - package-lock.json
          - .bolt/prompt \n
          `,
        ],
        uiPrompts: [reactBasePrompt],
      });
      return;
    }
    if (answer.includes("node")) {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.
          \nConsider the content of ALL files in the project.\n\n
          ${nodeBasePrompt}\n\nWere is a list that exist on the file system but are not being shown to you:\n\n
          - .gitignore
          - package-lock.json
          - .bolt/prompt \n
          `,
        ],
        uiPrompts: [nodeBasePrompt],
      });
      return;
    }
    res.status(400).send("Invalid answer");
  } catch (err: any) {
    console.error("Template error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;
    console.log(`[${new Date().toISOString()}] Processing /chat AI request...`);

    // Merge consecutive messages with the same role
    const mergedMessages: any[] = [];
    messages.forEach((msg: any) => {
      const role = msg.role === "assistant" ? "model" : "user";
      if (
        mergedMessages.length > 0 &&
        mergedMessages[mergedMessages.length - 1].role === role
      ) {
        mergedMessages[
          mergedMessages.length - 1
        ].parts[0].text += `\n\n${msg.content}`;
      } else {
        mergedMessages.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    });

    console.log(
      "Message roles being sent:",
      mergedMessages.map((m) => m.role)
    );

    const result = await model.generateContent({
      systemInstruction: getSystemPrompt(),
      contents: mergedMessages,
    });

    const text = result.response.text();
    console.log(`[${new Date().toISOString()}] /chat AI Request complete.`);
    console.log(`Contains boltArtifact: ${text.includes("<boltArtifact")}`);
    res.json({
      response: text,
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server is running on http://localhost:3000");
  console.log("Ready to handle /template and /chat requests.");
  console.log("Environment check:", {
    hasApiKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.slice(0, 4)
      : "NONE",
    port: 3000,
  });
});

// async function main() {
//   try {
//     const response = await ai.models.generateContentStream({
//       model: "gemini-3-flash-preview",
//       contents: [
//         {
//           role: "system",
//           parts: [{ text: getSystemPrompt() }],
//         },
//         {
//           role: "user",
//           parts: [
//             {
//               text: `For all designs I ask you to make, have them be beautiful, not cookie cutter.
// Make webpages that are fully featured and worthy for production.

// By default, this template supports JSX syntax with Tailwind CSS classes, React hooks,
// and Lucide React for icons. Do not install other packages unless requested.

// Use icons from lucide-react.
// Use stock photos from Unsplash (valid URLs only).`,
//             },
//           ],
//         },
//         {
//           role: "user",
//           parts: [
//             {
//               text: `Here is an artifact that contains all files of the project visible to you.

// {BASE_PROMPT}

// Files that exist but are not shown:
// - .gitignore
// - package-lock.json
// - .bolt/prompt`,
//             },
//           ],
//         },
//         {
//           role: "user",
//           parts: [{ text: "Create a todo app" }],
//         },
//       ],
//     });

//     for await (const chunk of response) {
//       if (chunk.text) {
//         process.stdout.write(chunk.text);
//       }
//     }
//   } catch (err) {
//     console.error("Gemini error:", err);
//   }
// }

// await main();
