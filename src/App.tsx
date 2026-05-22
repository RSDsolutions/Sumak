import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages placeholder
import Home from './pages/Home';
import Cursos from './pages/Cursos';
import CourseDetail from './pages/CourseDetail';
import Instructores from './pages/Instructores';
import Certificaciones from './pages/Certificaciones';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contacto from './pages/Contacto';
import Nosotros from './pages/Nosotros';
import Legal from './pages/Legal';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/cursos" element={<PageWrapper><Cursos /></PageWrapper>} />
        <Route path="/cursos/:slug" element={<PageWrapper><CourseDetail /></PageWrapper>} />
        <Route path="/instructores" element={<PageWrapper><Instructores /></PageWrapper>} />
        <Route path="/certificaciones" element={<PageWrapper><Certificaciones /></PageWrapper>} />
        <Route path="/blog" element={<PageWrapper><Blog /></PageWrapper>} />
        <Route path="/blog/:slug" element={<PageWrapper><BlogPost /></PageWrapper>} />
        <Route path="/contacto" element={<PageWrapper><Contacto /></PageWrapper>} />
        <Route path="/nosotros" element={<PageWrapper><Nosotros /></PageWrapper>} />
        <Route path="/terminos" element={<PageWrapper><Legal type="terms" /></PageWrapper>} />
        <Route path="/privacidad" element={<PageWrapper><Legal type="privacy" /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><Home /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex-grow flex flex-col"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
    </Router>
  );
}
