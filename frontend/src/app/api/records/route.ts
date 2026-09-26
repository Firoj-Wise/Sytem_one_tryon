import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Look in parent learning-records directory
    const recordsDir = path.resolve(process.cwd(), "..", "learning-records");
    
    if (!fs.existsSync(recordsDir)) {
      return NextResponse.json({ records: [] });
    }

    const files = fs.readdirSync(recordsDir).sort();
    const records = [];

    for (const file of files) {
      if (file.endsWith(".md")) {
        const filePath = path.join(recordsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        
        let title = file.replace(".md", "").replace(/^\d+-/, "").replace(/-/g, " ");
        title = title.charAt(0).toUpperCase() + title.slice(1);

        for (const line of content.split("\n")) {
          if (line.startsWith("# ")) {
            title = line.replace("# ", "").trim();
            break;
          }
        }

        records.push({
          id: file,
          title,
          content,
        });
      }
    }

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load records" }, { status: 500 });
  }
}
