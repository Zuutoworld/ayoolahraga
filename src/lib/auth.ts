export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string; // unik, lowercase
  name: string;
  pwHash: string;
  pwFallback: string; // hash cadangan kalau WebCrypto tidak tersedia
  role: Role;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  createdAt: number;
}

const K_USERS = "ayo_users_v1";
const K_SESSION = "ayo_session_v1";

// admin default: username "admin", password "admin123"
// Ganti kata sandi setelah login pertama.
const ADMIN_SHA = "4a9e216593580b213f56a3b1682b2704956b59741f2df2a2bb9a91195f81f1b8";
const ADMIN_FALLBACK = "f4826ae3a";

function readUsers(): User[] {
  try {
    const raw = localStorage.getItem(K_USERS);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function writeUsers(u: User[]): void {
  localStorage.setItem(K_USERS, JSON.stringify(u));
}

function seedIfEmpty(): User[] {
  const cur = readUsers();
  if (cur.length > 0) return cur;
  const admin: User = {
    id: "admin-1",
    username: "admin",
    name: "Admin",
    pwHash: ADMIN_SHA,
    pwFallback: ADMIN_FALLBACK,
    role: "admin",
    createdAt: Date.now(),
  };
  writeUsers([admin]);
  return [admin];
}

export async function hashPw(pw: string): Promise<{ h: string; f: string }> {
  let h = "";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pepper-ayo::" + pw));
    h = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    h = "";
  }
  let x = 0;
  const s = "ayo::" + pw;
  for (let i = 0; i < s.length; i++) {
    x = (Math.imul(x, 31) + s.charCodeAt(i)) | 0;
  }
  const f = "f" + (x >>> 0).toString(16);
  return { h, f };
}

export interface AuthResult {
  ok: boolean;
  user?: User;
  msg?: string;
}

export async function register(username: string, name: string, pw: string): Promise<AuthResult> {
  username = username.trim().toLowerCase().replace(/\s+/g, "_");
  name = name.trim();
  if (username.length < 3) return { ok: false, msg: "Username minimal 3 karakter." };
  if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, msg: "Username hanya huruf/angka/underscore." };
  if (name.length < 2) return { ok: false, msg: "Nama tampilan wajib diisi." };
  if (pw.length < 6) return { ok: false, msg: "Kata sandi minimal 6 karakter." };
  const users = seedIfEmpty();
  if (users.some((u) => u.username === username)) return { ok: false, msg: "Username sudah dipakai." };
  const { h, f } = await hashPw(pw);
  const u: User = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    name,
    pwHash: h,
    pwFallback: f,
    role: "user",
    createdAt: Date.now(),
  };
  users.push(u);
  writeUsers(users);
  localStorage.setItem(K_SESSION, u.id);
  return { ok: true, user: u };
}

export async function login(username: string, pw: string): Promise<AuthResult> {
  username = username.trim().toLowerCase();
  const users = seedIfEmpty();
  const u = users.find((x) => x.username === username);
  if (!u) return { ok: false, msg: "Username tidak ditemukan." };
  const { h, f } = await hashPw(pw);
  const match = (h && u.pwHash === h) || u.pwFallback === f;
  if (!match) return { ok: false, msg: "Kata sandi salah." };
  localStorage.setItem(K_SESSION, u.id);
  return { ok: true, user: u };
}

export function logout(): void {
  localStorage.removeItem(K_SESSION);
}

export function currentUser(): User | null {
  const users = seedIfEmpty();
  const id = localStorage.getItem(K_SESSION);
  if (!id) return null;
  return users.find((u) => u.id === id) ?? null;
}

export function listUsers(): User[] {
  return seedIfEmpty().slice().sort((a, b) => a.createdAt - b.createdAt);
}

export function updateUser(id: string, patch: Partial<User>): User[] {
  const users = seedIfEmpty().map((u) => (u.id === id ? { ...u, ...patch } : u));
  writeUsers(users);
  return users;
}

export async function setPassword(id: string, newPw: string): Promise<User[]> {
  if (newPw.length < 6) throw new Error("Kata sandi minimal 6 karakter.");
  const { h, f } = await hashPw(newPw);
  return updateUser(id, { pwHash: h, pwFallback: f });
}

export function deleteUser(id: string): User[] {
  const users = seedIfEmpty().filter((u) => u.id !== id);
  writeUsers(users);
  return users;
}
