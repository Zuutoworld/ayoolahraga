import { useState } from "react";
import { login, register } from "../lib/auth";
import type { User } from "../lib/auth";

export default function AuthScreen({ onDone }: { onDone: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const r = mode === "login" ? await login(username, pw) : await register(username, name, pw);
    setBusy(false);
    if (!r.ok || !r.user) {
      setMsg(r.msg ?? "Gagal. Silakan coba lagi.");
      return;
    }
    onDone(r.user);
  };

  return (
    <div className="card center">
      <h2>AyoOlahraga</h2>
      <p className="muted">Gratis, tanpa langganan. Data kesimpan di HP ini.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className={mode === "login" ? "btn primary" : "btn"} onClick={() => setMode("login")}>Masuk</button>
        <button className={mode === "register" ? "btn primary" : "btn"} onClick={() => setMode("register")}>Daftar</button>
      </div>
      <label style={{ textAlign: "left" }}>Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mis. king" autoCapitalize="off" />
      </label>
      {mode === "register" && (
        <label style={{ textAlign: "left" }}>Nama tampilan
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap Anda" />
        </label>
      )}
      <label style={{ textAlign: "left" }}>Kata Sandi
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min. 6 karakter" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
      </label>
      {msg && <p className="err">{msg}</p>}
      <button className="btn primary" style={{ width: "100%" }} disabled={busy} onClick={() => void submit()}>
        {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Buat Akun"}
      </button>
      <p className="muted" style={{ marginTop: 10 }}>
        Akun administrator bawaan: <b>admin</b> / <b>admin123</b> — segera ganti kata sandi setelah masuk pertama kali.
      </p>
    </div>
  );
}
