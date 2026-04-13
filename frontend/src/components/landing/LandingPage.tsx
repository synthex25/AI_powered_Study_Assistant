import { useEffect, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowRight, FiBookOpen, FiLayers, FiMessageSquare,
  FiZap, FiShield, FiTrendingUp, FiMenu, FiX, FiStar,
} from 'react-icons/fi';
import { AuthModal } from '../auth';
import { MascotSVG } from './RobotComponent';

const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#features' },
  { label: 'Contact', href: '#contact' },
];

const FEATURES = [
  {
    icon: <FiBookOpen size={22} />,
    iconBg: '#eff6ff', iconColor: '#2563eb',
    title: 'AI-Powered Notes',
    text: 'Upload any PDF or URL and get structured, readable study notes instantly.',
  },
  {
    icon: <FiLayers size={22} />,
    iconBg: '#eff6ff', iconColor: '#1d4ed8',
    title: 'Smart Flashcards',
    text: 'Auto-generated flashcards from your content for active recall practice.',
  },
  {
    icon: <FiMessageSquare size={22} />,
    iconBg: '#eff6ff', iconColor: '#1d4ed8',
    title: 'RAG Chat Tutor',
    text: 'Ask questions and get answers grounded in your own uploaded documents.',
  },
  {
    icon: <FiZap size={22} />,
    iconBg: '#eff6ff', iconColor: '#2563eb',
    title: 'Instant Quizzes',
    text: 'MCQ quizzes generated from your material to test understanding fast.',
  },
  {
    icon: <FiShield size={22} />,
    iconBg: '#eff6ff', iconColor: '#1d4ed8',
    title: 'Secure & Private',
    text: 'JWT-authenticated workspaces - your data stays yours, always.',
  },
  {
    icon: <FiTrendingUp size={22} />,
    iconBg: '#eff6ff', iconColor: '#2563eb',
    title: 'Progress Tracking',
    text: 'Heatmap and quiz scores to visualise your learning momentum.',
  },
];

const STATS = [
  { value: '< 2 min', label: 'Setup time' },
  { value: '3 formats', label: 'PDF · URL · Text' },
  { value: '4 modes', label: 'Notes · Cards · Quiz · Chat' },
  { value: '100%', label: 'AI-powered' },
];

const STEPS = [
  { num: '01', title: 'Create a workspace', text: 'Organise each subject into its own workspace.' },
  { num: '02', title: 'Add your sources', text: 'Upload PDFs, paste URLs, or type raw text.' },
  { num: '03', title: 'Generate AI content', text: 'One click produces notes, flashcards, and quizzes.' },
  { num: '04', title: 'Chat with your tutor', text: 'Ask follow-up questions answered from your docs.' },
];

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #bfdbfe',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.75rem',
  borderRadius: 999,
  background: '#ffffff',
  color: '#1e3a8a',
  border: '2px solid #2563eb',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 1px 2px rgba(37,99,235,0.08)',
};

const LandingPage: FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) navigate('/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get('auth')) {
      setShowAuth(true);
      const p = new URLSearchParams(searchParams);
      p.delete('auth');
      setSearchParams(p, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openAuth = () => {
    setShowAuth(true);
    setMobileOpen(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#eff6ff',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        color: '#1e3a8a',
        overflowX: 'hidden',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          boxShadow: scrolled ? '0 2px 8px rgba(37,99,235,0.08)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <nav style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiZap size={18} color="#ffffff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e3a8a', letterSpacing: '-0.02em' }}>StudyAI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 999,
                  color: '#1d4ed8',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#1e3a8a'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#1d4ed8'; }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={openAuth} className="hidden sm:block" style={buttonStyle}>
              Log In
            </button>
            <button onClick={openAuth} style={buttonStyle}>
              Sign In <FiArrowRight size={14} />
            </button>
            <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden" style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', padding: 4 }}>
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ background: '#ffffff', borderTop: '1px solid #bfdbfe', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{ padding: '0.65rem 1rem', borderRadius: 10, color: '#1d4ed8', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}
                >
                  {link.label}
                </a>
              ))}
              <button onClick={openAuth} style={{ marginTop: 4, ...buttonStyle, justifyContent: 'center' }}>
                Get Started <FiArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="hero" style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem 6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 1rem', borderRadius: 999, marginBottom: '1.5rem', background: '#ffffff', border: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: 600, color: '#1d4ed8' }}>
              <FiStar size={12} color="#2563eb" /> AI Study Assistant
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.25rem', color: '#1e3a8a' }}>
              Smart AI Assistant{' '}
              <span style={{ color: '#2563eb' }}>for Web & Mobile</span>
            </h1>

            <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: '#1d4ed8', marginBottom: '2rem', maxWidth: 480 }}>
              Upload PDFs, articles, or text and instantly get structured notes,
              smart flashcards, quizzes, and a context-aware AI tutor - all in one workspace.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '2.5rem' }}>
              <button onClick={openAuth} style={buttonStyle}>
                Get Started Free <FiArrowRight size={16} />
              </button>
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} style={buttonStyle}>
                See Features
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {STATS.map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 280, height: 320, filter: 'drop-shadow(0 8px 24px rgba(37,99,235,0.12))' }}>
              <MascotSVG idPrefix="hero" />
            </motion.div>
          </motion.div>
        </section>

        <section id="features" style={{ background: '#ffffff', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 1rem', borderRadius: 999, marginBottom: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>
                Everything you need
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
                One workspace. All your study tools.
              </h2>
              <p style={{ color: '#1d4ed8', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
                Everything from AI notes to interactive quizzes, built into a single clean interface.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(37,99,235,0.10)' }}
                  style={{ ...cardStyle, padding: '1.5rem', transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: f.iconColor }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: '#1d4ed8', lineHeight: 1.6 }}>{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
              How it works
            </h2>
            <p style={{ color: '#1d4ed8', fontSize: '1.05rem' }}>From upload to insight in under two minutes.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{ ...cardStyle, padding: '1.75rem 1.5rem' }}
              >
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb', marginBottom: '0.75rem' }}>{step.num}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#1d4ed8', lineHeight: 1.6 }}>{step.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="contact" style={{ background: '#eff6ff', padding: '5rem 1.5rem' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', ...cardStyle, padding: '4rem 2rem', textAlign: 'center' }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 80, height: 92, margin: '0 auto 1.5rem' }}>
              <MascotSVG idPrefix="cta" />
            </motion.div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Ready to study smarter?
            </h2>
            <p style={{ color: '#1d4ed8', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto 2rem' }}>
              Join thousands of students using AI to turn dense material into clear, actionable knowledge.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={openAuth} style={buttonStyle}>
                Start for Free <FiArrowRight size={16} />
              </button>
              <button onClick={openAuth} style={buttonStyle}>
                Log In
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #bfdbfe', padding: '2rem 1.5rem', textAlign: 'center', color: '#1d4ed8', fontSize: '0.82rem', background: '#eff6ff' }}>
        © {new Date().getFullYear()} StudyAI · Built with React, FastAPI & Gemini
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default LandingPage;
