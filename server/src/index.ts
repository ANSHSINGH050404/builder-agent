import { GoogleGenAI } from "@google/genai";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import dotenv from "dotenv";
import fs from "fs";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
dotenv.config();

import express from "express";
const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
      {
        role: "system",
        parts: [
          {
            text: "Return either node or react based on what you things the project should be.Only return the name of the framework. either node or react.Do not return anything extra.",
          },
        ],
      },
    ],
  });

  console.log(response.text);

  const answer = response.text;

  if (answer === "react") {
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
  if (answer === "node") {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.
        \nConsider the content of ALL files in the project.\n\n
        ${reactBasePrompt}\n\nWere is a list that exist on the file system but are not being shown to you:\n\n
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
  return;
});

app.post("/chat",async(req,res) =>{
  const messages=req.body.messages
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:[
      {
        role:"system",
        parts:[
          {
            text:getSystemPrompt()
          }
        ]
      },
      {
        role:"user",
        parts:[
          {
            text:messages
          }
        ]
      }
    ]
  });

  console.log(response.text);
  res.json({});

})

app.listen(3000, () => {
  console.log("Server started on port 3000");
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
