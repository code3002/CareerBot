const pdfParse = require("pdf-parse");

async function parsePDF(buffer) {
  try {
    const parsedDocument = await pdfParse(buffer);
    const rawText = parsedDocument.text || "";

    const cleanedText = rawText
      .replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, " ")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!cleanedText) {
      throw new Error("The uploaded PDF did not contain readable text.");
    }

    return cleanedText;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

module.exports = {
  parsePDF
};
