import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '../../hooks';
import { AuthModal } from '../auth';
import { 
  FaRobot, 
  FaFileAlt, 
  FaBrain, 
  FaGraduationCap,
  FaStar,
  FaArrowRight,
  FaLightbulb,
  FaGlobe,
  FaCode,
  FaNewspaper,
  FaBook
} from 'react-icons/fa';

import Logo from '../common/Logo';


// ============================================================================
// Content Types - What we support
// ============================================================================

const contentTypes = [
  { icon: FaFileAlt, label: 'PDFs', color: 'text-blue-600' },
  { icon: FaGlobe, label: 'URLs', color: 'text-blue-600' },
  { icon: FaNewspaper, label: 'Blogs', color: 'text-blue-600' },
  { icon: FaCode, label: 'API Docs', color: 'text-blue-600' },
  { icon: FaBook, label: 'Articles', color: 'text-blue-600' }
];

// ============================================================================
// Feature Data
// ============================================================================

const features = [
  {
    icon: FaBrain,
    title: 'AI-Powered Notes',
    description: 'Transform any content into comprehensive, structured notes instantly.',
  },
  {
    icon: FaGraduationCap,
    title: 'Smart Quizzes',
    description: 'Auto-generate quizzes to test your knowledge and reinforce learning.',
  },
  {
    icon: FaFileAlt,
    title: 'Flashcards',
    description: 'Create flashcards for efficient memorization and quick revision.',
  },
  {
    icon: FaRobot,
    title: 'AI Tutor',
    description: 'Chat with an AI tutor that answers your questions instantly.',
  }
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Medical Student',
    content: 'Notewise has revolutionized how I study. I can import research papers, medical blogs, and textbook PDFs all in one place!',
    avatar: 'SJ'
  },
  {
    name: 'Michael Chen',
    role: 'Software Engineer',
    content: 'The API docs feature is a game-changer. I paste documentation URLs and get instant summaries and quizzes.',
    avatar: 'MC'
  },
  {
    name: 'Emily Davis',
    role: 'Content Creator',
    content: 'I use it to study competitor blogs and industry articles. The AI understands everything perfectly.',
    avatar: 'ED'
  }
];

// ============================================================================
// Component
// ============================================================================

const LandingPage: FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem("accessToken")

  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    const authType = searchParams.get('auth');
    if (authType === 'login' || authType === 'signup') {
      setShowAuthModal(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('auth');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleGetStarted = () => {
    setShowAuthModal(true);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How it Works' },
    { id: 'testimonials', label: 'Testimonials' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden scroll-smooth">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                className="text-gray-700 hover:text-blue-600 transition-colors py-2 font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
              Transform Any Content Into Knowledge
            </h1>

            {/* Content Types Showcase */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {contentTypes.map((type) => (
                <div
                  key={type.label}
                  className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-full px-4 py-2"
                >
                  <type.icon className={`${type.color}`} />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </div>
              ))}
            </div>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Upload PDFs, paste URLs, import blogs, or add API documentation. Let AI generate comprehensive notes, quizzes, flashcards, and chat with your AI tutor.
            </p>

            {/* CTA Button */}
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-3"
            >
              Start Learning Free
              <FaArrowRight className="text-sm" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Powerful Learning Tools
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to study smarter and learn faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="text-2xl text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to transform your learning.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FaFileAlt, step: '1', title: 'Add Your Content', description: 'Upload PDFs, paste URLs, or import blogs.' },
              { icon: FaBrain, step: '2', title: 'AI Processing', description: 'Our AI analyzes and extracts key information.' },
              { icon: FaLightbulb, step: '3', title: 'Start Learning', description: 'Access notes, quizzes, flashcards, and AI tutor.' }
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-lg bg-blue-600 flex items-center justify-center mx-auto">
                    <item.icon className="text-3xl text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Loved by Students
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of learners who've improved their study habits.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-white text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Ready to Study Smarter?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Start your free account today.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-blue-600 text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Logo className="justify-center mb-4" />
          <p className="text-gray-600 text-sm mb-4">
            © {new Date().getFullYear()} Notewise. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-600 justify-center">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default LandingPage;
