// Firebase SDK는 브라우저에서 바로 불러옵니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 콘솔에서 만든 이 웹 앱의 공개 설정입니다.
const firebaseConfig = {
  apiKey: "AIzaSyDZtq_jjSyZbl7jBR9o8QsPal1pcx0VmL8",
  authDomain: "dyonk-113e7.firebaseapp.com",
  projectId: "dyonk-113e7",
  storageBucket: "dyonk-113e7.firebasestorage.app",
  messagingSenderId: "168963957159",
  appId: "1:168963957159:web:c9a3cd055a2eadd2589682"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ===================================================
// 사용자 역할 (Role) 관리
// 교사(T): 모든 메모 삭제 및 관리 권한
// 학생(S): 본인 메모만 작성 및 삭제 가능
// ===================================================

// 교사 UID 목록 (교사 사용자의 Firebase Auth UID를 아래 배열에 넣어주세요)
const TEACHER_UIDS = [];

// Firestore 컬렉션 이름
const MEMO_COLLECTION = "memos";

// 사용자 역할 확인 함수 (교사: 'T', 학생: 'S', 미로그인: null)
function getUserRole(user) {
  if (!user) return null;
  return TEACHER_UIDS.includes(user.uid) ? "T" : "S";
}

// ===================================================
// 구글 로그인 관련 기능
// ===================================================

const userArea = document.getElementById("userArea");

// 로그인 상태 변경 감지
onAuthStateChanged(auth, function (user) {
  renderUserArea(user);
  render(); // 로그인 상태에 따라 삭제 권한이 변경되므로 메모 목록을 다시 그립니다.
});

// 구글 로그인 실행
async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("로그인 실패:", error);
    alert("로그인에 실패했습니다.");
  }
}

// 로그아웃 실행
async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 실패:", error);
  }
}

// ===================================================
// Gemini AI 피드백 호출 함수 (교사 전용)
// ===================================================
async function getAiComment() {
  const currentUser = auth.currentUser;
  if (getUserRole(currentUser) !== "T") {
    alert("AI 코멘트 기능은 교사(T)만 사용할 수 있습니다.");
    return;
  }

  if (!memos || memos.length === 0) {
    alert("담벼락에 게시된 메모가 없습니다.");
    return;
  }

  const feedbackBox = document.getElementById("aiFeedbackBox");
  const feedbackContent = document.getElementById("aiFeedbackContent");

  if (feedbackBox && feedbackContent) {
    feedbackBox.style.display = "block";
    feedbackContent.textContent = "🤖 AI가 담벼락 메모들을 분석하여 피드백을 작성 중입니다...";
  }

  try {
    // 학생 개인정보(UID, 이메일 등)는 제외하고 메모 텍스트 내용만 보냅니다.
    const memoTexts = memos.map(function (m) { return m.text; });

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ memos: memoTexts })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI 코멘트를 불러오지 못했습니다.");
    }

    if (feedbackContent) {
      feedbackContent.textContent = data.comment;
    }
  } catch (error) {
    console.error("AI 코멘트 오류:", error);
    if (feedbackContent) {
      feedbackContent.textContent = `오류 발생: ${error.message}`;
    }
  }
}

// 로그인 영역 화면 그리기 및 입력창 제어
function renderUserArea(user) {
  if (!userArea) return;
  userArea.innerHTML = "";

  const input = document.getElementById("input");

  if (user) {
    const role = getUserRole(user);
    const roleLabel = role === "T" ? "교사(T)" : "학생(S)";
    // 로그인한 경우: 입력창 활성화
    if (input) {
      input.disabled = false;
      input.placeholder = "메모를 쓰고 엔터";
    }

    const span = document.createElement("span");
    span.textContent = `${user.displayName || "사용자"}님 [${roleLabel}] 환영합니다! `;
    userArea.appendChild(span);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", logout);
    userArea.appendChild(logoutBtn);

    // 교사(T) 전용 AI 총평 버튼
    if (role === "T") {
      const aiBtn = document.createElement("button");
      aiBtn.textContent = "🤖 AI 총평 받기";
      aiBtn.style.marginLeft = "10px";
      aiBtn.style.backgroundColor = "#4f46e5";
      aiBtn.style.color = "#ffffff";
      aiBtn.style.border = "none";
      aiBtn.style.padding = "4px 10px";
      aiBtn.style.borderRadius = "4px";
      aiBtn.style.cursor = "pointer";
      aiBtn.addEventListener("click", getAiComment);
      userArea.appendChild(aiBtn);
    }
  } else {
    // 비로그인 상태인 경우: 입력창 비활성화 및 구글 로그인 버튼 표시
    if (input) {
      input.disabled = true;
      input.placeholder = "로그인해야 메모를 작성할 수 있습니다.";
    }

    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google로 로그인";
    loginBtn.addEventListener("click", loginWithGoogle);
    userArea.appendChild(loginBtn);
  }
}

// 메모 목록은 Firestore의 변경 내용을 받아 화면에 보여 줍니다.
let memos = [];


// ===================================================
// 데이터를 다루는 함수 세 개
// Firestore를 쓰는 코드입니다.
// ===================================================

// 메모를 읽어 옵니다.
function loadMemos() {
  const memosQuery = query(collection(db, MEMO_COLLECTION), orderBy("createdAt", "asc"));
  onSnapshot(memosQuery, function (snapshot) {
    memos = snapshot.docs.map(function (memoDoc) {
      return { id: memoDoc.id, ...memoDoc.data() };
    });
    render();
  }, function (error) {
    console.error("메모를 불러오지 못했습니다.", error);
  });
}

// 메모를 새로 씁니다.
async function addMemo(text) {
  const user = auth.currentUser;
  if (!user) {
    alert("로그인해야 메모를 작성할 수 있습니다.");
    return;
  }
  const role = getUserRole(user) || "S";
  await addDoc(collection(db, MEMO_COLLECTION), {
    text: text,
    author: user ? (user.displayName || "익명") : "익명",
    uid: user ? user.uid : null,
    role: role,
    createdAt: serverTimestamp()
  });
}

// 메모를 지웁니다.
async function deleteMemo(id) {
  const user = auth.currentUser;
  if (getUserRole(user) !== "T") {
    alert("메모 삭제 권한은 교사(T)에게만 있습니다.");
    return;
  }
  await deleteDoc(doc(db, MEMO_COLLECTION, id));
}


// ===================================================
// 화면 그리기
// ===================================================

function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const currentUser = auth.currentUser;
  const userRole = getUserRole(currentUser);
  // 삭제 권한: 교사(T)에게만 삭제 권한 부여
  const canDelete = currentUser && userRole === "T";

  if (canDelete) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.addEventListener("click", async function () {
      try {
        await deleteMemo(memo.id);
      } catch (error) {
        console.error("메모를 지우지 못했습니다.", error);
      }
    });
    div.appendChild(del);
  }

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  // 작성자가 있으면 메모 하단에 표시합니다.
  if (memo.author) {
    const authorDiv = document.createElement("div");
    authorDiv.style.fontSize = "12px";
    authorDiv.style.color = "#777";
    authorDiv.style.marginTop = "6px";
    const roleTag = memo.role ? ` [${memo.role}]` : "";
    authorDiv.textContent = `- ${memo.author}${roleTag}`;
    div.appendChild(authorDiv);
  }

  return div;
}


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");
input.addEventListener("keydown", async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;
    try {
      await addMemo(text);
      input.value = "";
    } catch (error) {
      console.error("메모를 저장하지 못했습니다.", error);
      alert("메모를 저장하지 못했습니다.\n\n오류 내용: " + (error.message || error));
    }
  }
});


// 첫 화면에서 Firestore의 메모를 읽습니다.
loadMemos();
input.focus();
