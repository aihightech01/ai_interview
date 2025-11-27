
// 간단한 인메모리 회원 DB (localStorage에 저장/복원)
const initialUsers = [
  { id: "test", pw: "1234", name: "은혜", role: "user" },
];

let users = [...initialUsers];
let sessions = {}; // token -> { userId, issuedAt }

function persist() {
  try {
    localStorage.setItem("__mock_users__", JSON.stringify({ users, sessions }));
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem("__mock_users__");
    if (raw) {
      const data = JSON.parse(raw);
      users = data.users || [];
      sessions = data.sessions || {};
    }
  } catch (err) {
    console.warn("[mock-users] load 실패:", err);
  }
}
load();

function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const userDB = {
  add({ id, password, name, role = "user" }) {
    if (users.some((u) => u.id === id)) throw new Error("DUPLICATE_ID");
    const user = { id, password, name, role };
    users.push(user);
    persist();
    return user;
  },
  validate(id, password) {
    return users.find((u) => u.id === id && u.password === password) || null;
  },
  issueToken(userId) {
    const token = makeToken();
    sessions[token] = { userId, issuedAt: Date.now() };
    persist();
    return token;
  },
  findByToken(token) {
    const sess = sessions[token];
    if (!sess) return null;
    return users.find((u) => u.id === sess.userId) || null;
  },
};
