import { NextResponse } from 'next/server';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
  }

  try {
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    const fullText = docs.map((doc) => doc.pageContent).join("\n");

    return NextResponse.json({ success: true, text: fullText });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json({ success: false, error: "Failed to parse PDF" }, { status: 500 });
  }
} 