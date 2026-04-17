const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const PDFParser = require("pdf2json");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

let pdfText = "";
let chunks = [];
let weakTopics = [];

// 🔥 AI CALL
async function callAI(prompt) {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return res.data.choices[0].message.content;
}

// 📄 UPLOAD PDF
app.post("/upload", upload.single("file"), (req, res) => {
  const pdfParser = new PDFParser();

  pdfParser.on("pdfParser_dataReady", pdfData => {
    let text = "";

    pdfData.Pages.forEach(page => {
      page.Texts.forEach(t => {
        t.R.forEach(r => {
          text += decodeURIComponent(r.T) + " ";
        });
      });
    });

    pdfText = text;

    chunks = [];
    for (let i = 0; i < text.length; i += 500) {
      chunks.push(text.slice(i, i + 500));
    }

    res.json({ message: "PDF uploaded", chunks: chunks.length });
  });

  pdfParser.parseBuffer(req.file.buffer);
});

// 🤖 ASK
app.post("/ask", async (req, res) => {
  const { question } = req.body;
  const context = chunks.slice(0, 3).join("\n");

  const answer = await callAI(`
Act as a university professor.

Provide:
- Definition
- Explanation
- Key points
- Diagram (text)
- Advantages
- Conclusion
- Simple explanation

Context:
${context}

Question:
${question}
`);

  res.json({ answer });
});

// 🎓 STUDY
app.post("/study", async (req, res) => {
  const { topic } = req.body;

  const explanation = await callAI(`
Teach this topic:

1. Beginner
2. Intermediate
3. Advanced
4. Example
5. Mistakes

Then give 10-mark answer.

Topic: ${topic}
`);

  res.json({ explanation });
});

// 🔁 ADAPT
app.post("/adapt", async (req, res) => {
  const { feedback, topic } = req.body;

  if (feedback === "not_understood") weakTopics.push(topic);

  let prompt =
    feedback === "not_understood"
      ? `Explain ${topic} simply`
      : feedback === "distracted"
      ? `Short summary of ${topic}`
      : `Advanced questions on ${topic}`;

  const result = await callAI(prompt);

  res.json({ result });
});

// ❓ QUIZ (UPDATED)
app.post("/quiz", async (req, res) => {
  const { topic, marks } = req.body;

  const context = chunks.slice(0, 3).join("\n");

  const quiz = await callAI(`
Create a quiz based on the uploaded PDF.

Marks: ${marks}

Include:
- MCQs
- Short answers
- Mention marks for each question

Context:
${context}

Topic: ${topic}
`);

  res.json({ quiz });
});

// 🧠 REVISION
app.post("/revision", async (req, res) => {
  const { topic } = req.body;

  const result = await callAI(`
Generate:
- Flashcards
- Flowchart
- Key points

Topic:
${topic}
`);

  res.json({ result });
});

// 📊 WEAKNESS
app.get("/weakness", async (req, res) => {
  const result = await callAI(`
Analyze weaknesses:
${weakTopics.join(", ")}
`);

  res.json({ result });
});

// 🤯 DOUBT
app.post("/doubt", async (req, res) => {
  const { doubt } = req.body;

  const answer = await callAI(`Explain clearly: ${doubt}`);
  res.json({ answer });
});

// 📝 EXAM ANSWER
app.post("/exam-answer", async (req, res) => {
  const { question } = req.body;

  const answer = await callAI(`
Write a perfect 10-mark answer:

- Introduction
- Explanation
- Points
- Diagram
- Conclusion

Question:
${question}
`);

  res.json({ answer });
});

app.listen(5000, () => console.log("🚀 Server running on 5000"));




