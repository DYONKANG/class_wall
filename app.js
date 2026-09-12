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
  await addDoc(collection(db, "memos"), {
    text: text,
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
