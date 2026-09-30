/*
 * "We're hiring" card, right-hand side of the team panel (css/team-hire.css,
 * behaviour: legacy/team.js). A careers header and four small cards, each with
 * its own colour, motion and kind of content:
 *   1. Open roles          — team filter + role list          (violet)
 *   2. Send your CV        — tick-off checklist + progress ring (emerald)
 *   3. How we hire         — four-step timeline, auto-advancing (amber)
 *   4. Life at Better Pitch — rotating perk carousel           (sky)
 * Static markup: legacy/team.js wires the filter, checklist, steps and carousel.
 */
const ROLES = [
  { team: 'eng', title: 'Voice AI Engineer', meta: 'Engineering · Bengaluru / Remote' },
  { team: 'sales', title: 'Enterprise Account Executive', meta: 'Sales · Mumbai / Delhi' },
  { team: 'success', title: 'Deployment Manager', meta: 'Customer success · Bengaluru' },
];
const CHECKS = ['Your CV (PDF)', 'What you’d build', 'Links to your work'];
const STEPS = [
  ['Intro chat', '30 minutes with the hiring manager on what you want to build and why here.'],
  ['Deep-dive', 'A practical problem from our real work, talked through together.'],
  ['Founders', 'Meet the founders: product, culture and where we’re heading.'],
  ['Offer', 'A decision within a week of your first call, with clear feedback.'],
];
const PERKS = [
  ['Week 1', 'Your work reaches customers’ live calls in your first week.'],
  ['Hybrid', 'Remote-friendly and judged on outcomes, not hours.'],
  ['100+', 'Languages our agents speak. Learn what callers really say.'],
  ['Small team', 'Senior people, real ownership, no layers in between.'],
];

const ICON = {
  bag: <><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></>,
  steps: <path d="M4 20h4v-4h4v-4h4V8h4" />,
  spark: <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[name]}</svg>
);
const Tag = ({ icon, children }) => (
  <span className="hc__tag"><i><Icon name={icon} /></i>{children}</span>
);

export default function TeamHire() {
  return (
    <aside className="team-hire" aria-label="We're hiring">
      <header className="hire-head">
        <span className="team-hire__orb" aria-hidden="true" />
        <div className="hire-head__text">
          <p className="team-hire__from">Better Pitch · Careers</p>
          <h3 className="hire-head__title">Help make every business call feel human.</h3>
        </div>
        <span className="team-hire__badge">
          <span className="team-hire__pulse" aria-hidden="true" />
          {"We’re hiring"}
        </span>
      </header>

      <div className="hire-grid">
        {/* 1. open roles: filter + list */}
        <article className="hc hc--roles" aria-label="Open roles">
          <div className="hc__top">
            <Tag icon="bag">Open roles</Tag>
            <span className="hc__live"><b />{ROLES.length} open</span>
          </div>
          <div className="hc-filter" role="group" aria-label="Filter roles by team">
            <button type="button" className="is-active" data-filter="all">All</button>
            <button type="button" data-filter="eng">Eng</button>
            <button type="button" data-filter="sales">Sales</button>
            <button type="button" data-filter="success">Success</button>
          </div>
          <ul className="hc-roles">
            {ROLES.map((r, i) => (
              <li key={r.title} data-team={r.team} style={{ '--i': i }}>
                <a href="#section-footer">
                  <span><strong>{r.title}</strong><em>{r.meta}</em></span>
                  <Icon name="arrow" />
                </a>
              </li>
            ))}
          </ul>
        </article>

        {/* 2. send your CV: checklist + ring */}
        <article className="hc hc--cv" aria-label="Send your CV">
          <div className="hc__top">
            <Tag icon="file">Send your CV</Tag>
          </div>
          <div className="hc-cv">
            <div className="hc-ring" style={{ '--p': 0 }} aria-hidden="true">
              <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" /><circle className="hc-ring__fill" cx="18" cy="18" r="15.5" pathLength="100" /></svg>
              <span className="hc-ring__num">0/{CHECKS.length}</span>
              <span className="hc-ring__doc"><Icon name="file" /></span>
            </div>
            <ul className="hc-checks" aria-label="What to send">
              {CHECKS.map((c) => (
                <li key={c}>
                  <button type="button" aria-pressed="false"><span className="hc-checks__box"><Icon name="check" /></span>{c}</button>
                </li>
              ))}
            </ul>
          </div>
          <p className="hc-cv__note" aria-live="polite">Tick what you have ready.</p>
        </article>

        {/* 3. how we hire: timeline */}
        <article className="hc hc--steps" aria-label="How we hire">
          <div className="hc__top">
            <Tag icon="steps">How we hire</Tag>
            <span className="hc__meta">~1 week</span>
          </div>
          <ol className="hc-steps" style={{ '--step': 0 }}>
            {STEPS.map(([t], i) => (
              <li key={t}>
                <button type="button" className={i === 0 ? 'is-active' : ''} data-step={i}>
                  <span className="hc-steps__dot">{i + 1}</span>
                  <span className="hc-steps__label">{t}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="hc-steps__detail" aria-live="polite">
            {STEPS.map(([t, d], i) => (
              <p key={t} className={i === 0 ? 'is-active' : ''} data-detail={i}>{d}</p>
            ))}
          </div>
        </article>

        {/* 4. life at Better Pitch: carousel */}
        <article className="hc hc--life" aria-label="Life at Better Pitch">
          <span className="hc-bubbles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          <div className="hc__top">
            <Tag icon="spark">Life at Better Pitch</Tag>
          </div>
          <div className="hc-perks" aria-live="polite">
            {PERKS.map(([big, txt], i) => (
              <div key={big} className={`hc-perk${i === 0 ? ' is-active' : ''}`} data-perk={i}>
                <strong>{big}</strong>
                <p>{txt}</p>
              </div>
            ))}
          </div>
          <div className="hc-dots" role="group" aria-label="Perks">
            {PERKS.map(([big], i) => (
              <button key={big} type="button" className={i === 0 ? 'is-active' : ''} data-go={i} aria-label={big}><span /></button>
            ))}
          </div>
        </article>
      </div>

      <footer className="hire-foot">
        <p>Every card is interactive: filter, tick and tap.</p>
        <a className="team-hire__btn" href="#section-footer">
          Apply now <Icon name="arrow" />
        </a>
      </footer>
    </aside>
  );
}
