// ===================================================
// Vercel 서버리스 함수: Gemini API를 호출하여 담벼락 메모에 대한 AI 피드백을 생성합니다.
//
// API 키 보안:
//   API 키(GEMINI_API_KEY)는 Vercel 환경변수(process.env)에서 안전하게 읽어옵니다.
// 개인정보 보호:
//   학생의 이름, 이메일, UID 등 개인 식별 정보는 제외하고 메모 본문 텍스트만 전달합니다.
// ===================================================

export default async function handler(req, res) {
  // POST 요청만 허용합니다.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API 키가 설정되지 않았습니다. Vercel 환경변수에 GEMINI_API_KEY를 설정해주세요."
    });
  }

  try {
    const { memos } = req.body;

    if (!memos || !Array.isArray(memos) || memos.length === 0) {
      return res.status(400).json({ error: "피드백을 생성할 메모가 없습니다." });
    }

    // 학생 개인정보 제외: 메모 텍스트 내용만 추출하여 나열
    const memoTexts = memos
      .map((text, idx) => `${idx + 1}. ${text}`)
      .join("\n");

    const prompt = `당신은 친절하고 따뜻한 학급 담임 선생님 도우미 AI입니다.
아래는 학생들이 학급 담벼락에 남긴 메모들입니다.

[학생들의 담벼락 메모]
${memoTexts}

위 메모들을 바탕으로 선생님이 학생들에게 전할 따뜻한 총평 코멘트를 작성해주세요.
1. 학생들의 자유로운 참여를 칭찬하고 격려해주세요.
2. 학생들의 생각이나 메모 내용의 공통 주제를 긍정적으로 요약해주세요.
3. 교실에 어울리는 친근하고 다정한 존댓말 어조로 작성해 주세요.
4. 전체 분량은 3~5문장 내외로 작성해 주세요.`;

    // Google Gemini REST API (무료 제공 모델: gemini-1.5-flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return res.status(500).json({ error: "Gemini API 호출 중 오류가 발생했습니다." });
    }

    const data = await response.json();
    const resultText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "코멘트를 생성하지 못했습니다.";

    return res.status(200).json({ comment: resultText });
  } catch (error) {
    console.error("서버 처리 오류:", error);
    return res.status(500).json({ error: "서버 내부 처리 오류가 발생했습니다." });
  }
}
