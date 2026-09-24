import { useState, type FormEvent } from "react";
import { loginUser, loginGuest, registerUser, type AuthUser } from "./authStore";

type Mode = "login" | "register";

type Props = {
  onAuthenticated: (user: AuthUser) => void;
};

const hasJoinLink = () => window.location.pathname.startsWith("/join/") || new URL(window.location.href).searchParams.has("join");

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const joining = hasJoinLink();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const user = mode === "register"
        ? await registerUser({ name, email, password })
        : await loginUser({ email, password });
      onAuthenticated(user);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Не удалось выполнить вход");
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPassword("");
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand-row">
          <div className="auth-logo" aria-label="OnlineRepetitor">OR</div>
          <div>
            <div className="auth-brand">OnlineRepetitor</div>
            <div className="auth-subtitle">Интерактивная доска для занятий</div>
          </div>
        </div>

        {joining && <div className="access-notice">Откройте доску по приглашению: войдите в аккаунт или продолжите без регистрации.</div>}

        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Вход</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Регистрация</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div>
            <h1 id="auth-title">{mode === "register" ? "Создать аккаунт" : "С возвращением"}</h1>
            <p>{joining
              ? "После входа откроется доска, которой с вами поделились."
              : mode === "register"
                ? "Создайте аккаунт и начните работать с собственными досками."
                : "Войдите, чтобы продолжить занятие или открыть свои доски."}</p>
          </div>

          {mode === "register" && (
            <label className="auth-field">
              <span>Имя</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Введите ваше имя" maxLength={80} autoFocus />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="name@example.com" maxLength={180} autoFocus={mode === "login"} />
          </label>

          <label className="auth-field">
            <span>Пароль</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"} maxLength={200} />
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Подождите…" : mode === "register" ? "Зарегистрироваться" : "Войти"}
          </button>
          {joining && <><div className="auth-or"><span>или</span></div><label className="auth-field"><span>Ваше имя на доске</span><input value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Например, Анна" maxLength={60}/></label><button className="auth-guest" type="button" disabled={busy||guestName.trim().length<2} onClick={async()=>{if(busy)return;setBusy(true);setError("");try{onAuthenticated(await loginGuest(guestName))}catch(value){setError(value instanceof Error?value.message:"Не удалось войти как гость")}finally{setBusy(false)}}}>Продолжить как гость</button><p className="auth-guest-note">Аккаунт создавать не нужно. Это имя увидят участники доски.</p></>}
        </form>

        <div className="auth-role-note">
          <strong>Совместная работа:</strong> владелец управляет доступом, редактор изменяет содержимое, а режим просмотра защищает доску от случайных правок.
        </div>
      </section>
    </main>
  );
}
