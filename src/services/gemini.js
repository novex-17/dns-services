import { GoogleGenerativeAI } from "@google/generative-ai";

// Resizes and compresses a File object before sending to Gemini API
async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // Set maximum dimensions to 800 to make the upload ultra-fast (often < 100kb)
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(height * (MAX_SIZE / width));
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(width * (MAX_SIZE / height));
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 70% quality for fast network transfer
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64Data = dataUrl.split(',')[1];
      
      URL.revokeObjectURL(img.src); // Free memory

      resolve({
        inlineData: { data: base64Data, mimeType: 'image/jpeg' },
      });
    };
    
    img.onerror = (error) => {
      URL.revokeObjectURL(img.src);
      reject(error);
    };
  });
}

export async function generateFacebookCaption(apiKey, files) {
  if (!apiKey) throw new Error("API Key is required");
  if (!files || files.length === 0) throw new Error("No images provided");

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Dynamically fetch available models for this specific API key to completely avoid 404 errors
  const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const modelsData = await modelsResponse.json();
  
  if (!modelsResponse.ok) {
    throw new Error(modelsData.error?.message || "Failed to verify API key models.");
  }

  // Filter models that support text/image generation
  let validModels = modelsData.models
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => m.name.replace("models/", ""));

  // Prefer stable production models over preview/experimental/omni ones which often have 0 quota on free tiers
  const stableModels = validModels
    .filter(m => !m.includes("preview") && !m.includes("experimental") && !m.includes("exp") && !m.includes("omni"))
    .sort((a, b) => b.localeCompare(a));

  // Use stable models if available, otherwise fallback to all valid models
  const modelCandidateList = stableModels.length > 0 ? stableModels : validModels.sort((a, b) => b.localeCompare(a));

  if (modelCandidateList.length === 0) {
    throw new Error("No supported AI models found for your API key.");
  }

  const prompt = `คำเตือนสำคัญที่สุด: ห้ามพิมพ์ขั้นตอนการวิเคราะห์รูปภาพ ห้ามพิมพ์บันทึกความคิด (Chain of Thought) ห้ามมีสัญลักษณ์ * หรือการถอดรหัสใดๆ ทั้งสิ้น! ให้ตอบเฉพาะ "ข้อความ Caption โพสต์ Facebook" ตามโครงสร้างตัวอย่างด้านล่างทันที โดยเริ่มที่ชื่อประเภทไม้กอล์ฟทันที ห้ามมีคำเกริ่นนำ!

พิมพ์รายละเอียด จากรูปภาพ ที่ผมส่งให้ตามรูปแบบด้านล่างนี้ หากคุณไม่เห็นรายละเอียดใดในภาพให้เว้นข้อมูลว่างไว้ไม่ต้องเติม
และให้คุณ generate ข้อความแนะนำสั้นๆ เหมือนในตัวอย่าง สำหรับหัวไม้/ชุดเหล็ก/พัตเตอร์/ไฮบริด และถ้าเห็น เลข lot สินค้าใต้บาร์โค้ด, ราคา, ของแถม ให้ใส่เพิ่มได้เลย

ตัวอย่าง:
Driver Titleist TSI1
น้ำหนักเบาช่วยให้สวิงได้เร็วขึ้นลูกลอยง่าย เหมาะกับคนที่ตีลูกไม่ค่อยขึ้น

รายละเอียดสินค้า
Driver Titleist TSI1
Loft 10  ยาว 46 นิ้ว
ก้านกราไฟต์  TS013 45 Flex-SR
กริพพร้อมใช้งาน

ราคา 6,900 บาท
ค่าส่ง 150 บาท
แถมลูกกอล์ฟมูลค่า 170 บาท

Lot 62   260721006

📲 ทัก Inbox สั่งได้เลย
📲 ดูสินค้าเข้าใหม่ : https://dnsgolfoutlet.com
.
💳 รับบัตรเครดิต
📄 ออกใบกำกับภาษีได้
.
☎️ นิว 090-951-6412
☎️ กาย 061-535-7425
.
📍 แวะมาดูของที่ร้าน สุขุมวิท 62 แยก 12: https://maps.app.goo.gl/YMz9ANfS6fKeCoov6 
.
.
#Driver #Fairway #Hybrid #IronSet #Wedge #Putter #DNS #DonAndSons
#ไม้กอล์ฟ #ไม้กอล์ฟนำเข้า 
#ไม้กอล์ฟญี่ปุ่น #ไม้กอล์ฟนำเข้าจากญี่ปุ่น

ข้อมูลในรูปภาพ:`;

  const imageParts = await Promise.all(
    files.map((file) => fileToGenerativePart(file))
  );

  let lastError;
  for (const modelName of modelCandidateList) {
    try {
      console.log("Trying model candidate:", modelName);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn(`Model candidate ${modelName} failed (${error.message}). Trying next...`);
      lastError = error;
      // If it's a hard auth failure (bad API key), don't keep trying
      if (error.message.includes("API key not valid") || error.message.includes("403")) {
        throw error;
      }
    }
  }

  throw lastError;
}
