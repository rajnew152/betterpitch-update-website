import { useEffect, useRef, useState } from 'react';
import betterpitchSvg from '../assets/betterpitch.svg';
import betterpitchIcon from '../assets/betterpitch-icon.svg';

/*
 * Log in / sign up flow, three steps:
 *   1. account  – email (+ name on sign up), next to the voice-agent card
 *   2. verify   – 4-digit code sent to the email
 *   3. done     – setup complete, on to the dashboard
 * There is no auth backend yet: any 4 digits are accepted.
 */
const HOME = './';
const CODE_LEN = 4;

export default function Login() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');

  return (
    <main className={`lg-page lg-step-${step}`}>
      {step === 1 && (
        <StepAccount
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && <StepVerify email={email} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <StepDone mode={mode} />}
    </main>
  );
}

/* ---------- step 1 ---------- */

function StepAccount({ mode, setMode, email, setEmail, onNext }) {
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const signup = mode === 'signup';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canGo = emailOk && (!signup || (name.trim() && agree));
  /* how much of the form is filled in (0..1): the voice card warms up with it */
  const progress = signup ? ([name.trim(), emailOk, agree].filter(Boolean).length / 3) : (emailOk ? 1 : 0);

  const submit = (e) => {
    e.preventDefault();
    if (canGo) onNext();
  };

  return (
    <div className="lg-split">
      <section className="lg-form-side">
        <header className="lg-top">
          <a href={HOME} aria-label="Better Pitch home">
            <img src={betterpitchSvg} alt="Better Pitch" className="lg-logo" width="609" height="130" />
          </a>
          <a href={`${HOME}#section-faq`} className="lg-help">
            <span className="lg-help-dot" aria-hidden="true">?</span> Help
          </a>
        </header>

        <div className="lg-form-wrap">
          <h1 className="lg-title">{signup ? 'Meet Better Pitch!' : 'Welcome back!'}</h1>
          <p className="lg-sub">
            {signup
              ? 'Create your account and put a voice agent on your calls in minutes.'
              : 'Log in to pick up where your agents left off.'}
          </p>

          <div className="lg-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={signup} className={signup ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
            <button type="button" role="tab" aria-selected={!signup} className={!signup ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
          </div>

          <Stepper current={1} />

          <form className="lg-form" onSubmit={submit} noValidate>
            {signup && (
              <label className="lg-field">
                <span>Full name <em>*</em></span>
                <input type="text" autoComplete="name" placeholder="like : Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            )}
            <label className="lg-field">
              <span>Work email <em>*</em></span>
              <div className="lg-input-icon">
                <input type="email" autoComplete="email" placeholder="like : priya@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </div>
            </label>

            {signup && (
              <label className="lg-check">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I agree to <a href="#">Terms and Conditions</a> &amp; <a href="#">Privacy Policy</a></span>
              </label>
            )}

            <button type="submit" className="lg-btn" disabled={!canGo}>
              {signup ? 'Next Step' : 'Send login code'}
            </button>
          </form>
        </div>
      </section>

      <VoiceCard mode={mode} progress={progress} ready={canGo} />
    </div>
  );
}

function Stepper({ current }) {
  return (
    <ol className="lg-stepper" aria-label={`Step ${current} of 3`}>
      {[1, 2, 3].map((n, i) => (
        <li key={n} className={n === current ? 'on' : n < current ? 'done' : ''}>
          {i > 0 && <span className="lg-stepper-line" aria-hidden="true" />}
          <span className="lg-stepper-dot">{n === current ? '' : n}</span>
          {n === current && <span className="lg-stepper-label">Step {n}</span>}
        </li>
      ))}
    </ol>
  );
}

/* the right-hand card: the site's product-explainer look (logo gradient, mic orb,
   live transcript), in 3D. It tilts towards the pointer with its layers at
   different depths, floats when idle, flips over when the form switches between
   sign up and log in, and warms up as the form fills in (progress 0..1, ready) */
const LINES = {
  signup: ['Call me back about the premium plan', 'Can I move my EMI date to the 10th?', 'Book a site visit for Saturday, 11 am'],
  login: ['Welcome back! Your agents are live', 'Pick up where you left off', 'Your campaigns are waiting for you'],
};
const MicIcon = () => <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;

function VoiceCard({ mode, progress, ready }) {
  const [shown, setShown] = useState(mode);    // the side on show (switches mid-flip)
  const [flip, setFlip] = useState(false);
  const [text, setText] = useState('');
  const stage = useRef(null);

  /* flip over when the mode changes: the content swaps when the card is edge-on */
  useEffect(() => {
    if (mode === shown) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { setShown(mode); return; }
    setFlip(true);
    const t1 = setTimeout(() => setShown(mode), 420);
    const t2 = setTimeout(() => setFlip(false), 880);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the transcript types its lines, looping */
  useEffect(() => {
    const lines = LINES[shown];
    let line = 0, i = 0, pause = 0;
    setText('');
    const id = setInterval(() => {
      if (pause > 0) { pause--; return; }
      const full = lines[line];
      if (i <= full.length) { setText(full.slice(0, i)); i++; }
      else { pause = 25; i = 0; line = (line + 1) % lines.length; }
    }, 55);
    return () => clearInterval(id);
  }, [shown]);

  /* pointer tilt, eased every frame; the glare follows the pointer */
  useEffect(() => {
    const el = stage.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
    let raf = 0, on = false;
    const tick = () => {
      cur.x += (tgt.x - cur.x) * 0.1; cur.y += (tgt.y - cur.y) * 0.1;
      el.style.setProperty('--ry', (cur.x * 14).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-cur.y * 10).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (50 + cur.x * 50).toFixed(1) + '%');
      el.style.setProperty('--gy', (50 + cur.y * 50).toFixed(1) + '%');
      const moving = Math.abs(tgt.x - cur.x) > 0.001 || Math.abs(tgt.y - cur.y) > 0.001;
      raf = moving || on ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      tgt.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      tgt.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    };
    const enter = () => { on = true; el.classList.add('is-tilting'); kick(); };
    const leave = () => { on = false; tgt.x = 0; tgt.y = 0; el.classList.remove('is-tilting'); kick(); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  const login = shown === 'login';
  return (
    <aside className="lg-visual" aria-hidden="true">
      <div className="lg-visual-top">
        <span className="lg-chip"><span className="lg-chip-dot" /> {login ? 'Welcome back' : 'Sign up free'}</span>
      </div>
      <div ref={stage} className={`lg-3d${flip ? ' is-flipping' : ''}${ready ? ' is-ready' : ''}`} style={{ '--p': progress }}>
        <div className="lg-card">
          <span className="lg-card__bg" />
          <span className="lg-card__glare" />
          <a className="lg-watch lg-z1" href={`${HOME}#hero`} tabIndex={-1}><span className="lg-watch-dot" /> Watch video</a>
          <div className="lg-bars lg-z2">
            {Array.from({ length: 11 }).map((_, i) => <span key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />)}
          </div>
          <div className="lg-orb-wrap lg-z3">
            <span className="lg-ring" />
            <span className="lg-ring lg-ring--b" />
            <div className="lg-orb"><MicIcon /></div>
          </div>
          <div className="lg-listen lg-z2">
            <small>{login ? 'WELCOME BACK' : 'LISTENING'}</small>
            <p>{text}<span className="lg-caret" /></p>
          </div>
          <span className="lg-try lg-z4">
            <MicIcon />
            {ready ? 'All set, hit Next Step' : login ? 'Log in to your agents' : 'Try it with your business'}
          </span>
        </div>
      </div>
      <p className="lg-visual-foot"><b>@betterpitch</b> · the most natural voice AI</p>
    </aside>
  );
}

/* ---------- step 2 ---------- */

function StepVerify({ email, onBack, onNext }) {
  const [digits, setDigits] = useState(Array(CODE_LEN).fill(''));
  const [toast, setToast] = useState(true);
  const [checking, setChecking] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const fill = (next) => {
    setDigits(next);
    if (next.every((d) => d)) {
      setChecking(true);
      setTimeout(onNext, 900);
    }
  };

  const onChange = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (!clean) { const n = [...digits]; n[i] = ''; setDigits(n); return; }
    const n = [...digits];
    clean.slice(0, CODE_LEN - i).split('').forEach((c, k) => { n[i + k] = c; });
    refs.current[Math.min(i + clean.length, CODE_LEN - 1)]?.focus();
    fill(n);
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < CODE_LEN - 1) refs.current[i + 1]?.focus();
  };

  const resend = () => {
    setDigits(Array(CODE_LEN).fill(''));
    setChecking(false);
    setToast(false);
    requestAnimationFrame(() => setToast(true));
    refs.current[0]?.focus();
  };

  return (
    <div className="lg-stage">
      <a href={HOME} className="lg-stage-logo" aria-label="Better Pitch home">
        <img src={betterpitchSvg} alt="Better Pitch" width="609" height="130" />
      </a>
      <button type="button" className="lg-arrow lg-arrow-left" aria-label="Back" onClick={onBack}>
        <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
      </button>

      <div className="lg-panel">
        <div className="lg-panel-body">
          <span className="lg-badge">
            <svg viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="m3 9.5 9 6 9-6" /></svg>
          </span>
          <h1 className="lg-panel-title">Check your email</h1>
          <p className="lg-panel-text">
            We sent a {CODE_LEN}-digit code to <b>{email}</b><br />
            Please enter it below. Can't find it? Check your spam folder.
          </p>

          <div className={`lg-code${checking ? ' ok' : ''}`}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={CODE_LEN}
                aria-label={`Digit ${i + 1}`}
                value={d}
                disabled={checking}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>
          {checking && <p className="lg-verifying">Verifying…</p>}

          <button type="button" className="lg-link" onClick={resend}>Click to send a new code</button>
          <p className="lg-muted">Noticed a typo? <button type="button" className="lg-link" onClick={onBack}>Fix your email address</button></p>
        </div>

        <Dots current={2} />

        {toast && (
          <div className="lg-toast" role="status">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
            <span>The code has been sent! Please check your spam folder.</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToast(false)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- step 3 ---------- */

function StepDone({ mode }) {
  const [updates, setUpdates] = useState(true);
  return (
    <div className="lg-stage">
      <a href={HOME} className="lg-stage-logo" aria-label="Better Pitch home">
        <img src={betterpitchSvg} alt="Better Pitch" width="609" height="130" />
      </a>

      <div className="lg-panel">
        <div className="lg-panel-body">
          <span className="lg-app-icon">
            <img src={betterpitchIcon} alt="" />
            <span className="lg-app-check"><svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9" /></svg></span>
          </span>
          <h1 className="lg-panel-title">{mode === 'signup' ? 'Setup complete!' : "You're logged in!"}</h1>
          <p className="lg-panel-text">
            Nice work! Your account is all set up and ready.<br />
            Better Pitch is improving each week. These are the best ways to stay up-to-date and learn about changes.
          </p>

          <div className="lg-box">
            <div className="lg-box-row">
              <div>
                <b>Subscribe to weekly updates</b>
                <small>Email once a week about new features</small>
              </div>
              <button type="button" role="switch" aria-checked={updates} aria-label="Subscribe to weekly updates" className={`lg-switch${updates ? ' on' : ''}`} onClick={() => setUpdates(!updates)}>
                <span />
              </button>
            </div>
            <div className="lg-box-row">
              <div>
                <b>Follow us on LinkedIn</b>
                <small>Voice AI tips, launches and customer stories</small>
              </div>
              <a className="lg-follow" href="https://www.linkedin.com/" target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11 21 14v7h-4v-6.2c0-1.5-.03-3.4-2.07-3.4-2.08 0-2.4 1.62-2.4 3.3V21H10z" /></svg>
                @betterpitch
              </a>
            </div>
            <a className="lg-btn lg-btn-block" href={HOME}>Go to dashboard <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <Dots current={3} />
      </div>
    </div>
  );
}

function Dots({ current }) {
  return (
    <div className="lg-dots" aria-hidden="true">
      {[1, 2, 3].map((n) => <span key={n} className={n === current ? 'on' : ''} />)}
    </div>
  );
}
