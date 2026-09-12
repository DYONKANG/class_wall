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
// 구글 로그인 관련 기능
// ===================================================

const userArea = document.getElementById("userArea");

// 로그인 상태 변경 감지
onAuthStateChanged(auth, function (user) {
  renderUserArea(user);
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

// 로그인 영역 화면 그리기
function renderUserArea(user) {
  if (!userArea) return;
  userArea.innerHTML = "";

  if (user) {
    // 로그인한 경우: 이름과 로그아웃 버튼 표시
    const span = document.createElement("span");
    span.textContent = `${user.displayName || "선생님"}님 환영합니다! `;
    userArea.appendChild(span);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", logout);
    userArea.appendChild(logoutBtn);
  } else {
    // 비로그인 상태인 경우: 구글 로그인 버튼 표시
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
  const memosQuery = query(collection(db, "memos"), orderBy("createdAt", "asc"));
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
  await addDoc(collection(db, "memos"), {
    text: text,
    author: user ? (user.displayName || "익명") : "익명",
    createdAt: serverTimestamp()
  });
}

// 메모를 지웁니다.
async function deleteMemo(id) {
  await deleteDoc(doc(db, "memos", id));
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

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  // 작성자가 있으면 메모 하단에 표시합니다.
  if (memo.author) {
    const authorDiv = document.createElement("div");
    authorDiv.style.fontSize = "12px";
    authorDiv.style.color = "#777";
    authorDiv.style.marginTop = "6px";
    authorDiv.textContent = `- ${memo.author}`;
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
    }
  }
});


// 첫 화면에서 Firestore의 메모를 읽습니다.
loadMemos();
input.focus();
