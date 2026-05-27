import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';
import Productos from './pages/Productos';
import ProductDetail from './pages/ProductDetail';
import Oportunidad from './pages/Oportunidad';
import Plan from './pages/Plan';
import Escaleras from './pages/Escaleras';
import Contacto from './pages/Contacto';
import Registro from './pages/Registro';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-brand-black">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/nosotros" element={<PageTransition><Nosotros /></PageTransition>} />
            <Route path="/productos" element={<PageTransition><Productos /></PageTransition>} />
            <Route path="/productos/:slug" element={<PageTransition><ProductDetail /></PageTransition>} />
            <Route path="/oportunidad" element={<PageTransition><Oportunidad /></PageTransition>} />
            <Route path="/plan-multinivel" element={<PageTransition><Plan /></PageTransition>} />
            <Route path="/escaleras" element={<PageTransition><Escaleras /></PageTransition>} />
            <Route path="/contacto" element={<PageTransition><Contacto /></PageTransition>} />
            <Route path="/registro" element={<PageTransition><Registro /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          </Routes>
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </BrowserRouter>
  );
}
