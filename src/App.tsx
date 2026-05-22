/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Productos from './pages/Productos';
import ProductDetail from './pages/ProductDetail';
import Plan from './pages/Plan';
import ComoFunciona from './pages/ComoFunciona';
import Registro from './pages/Registro';
import Testimonios from './pages/Testimonios';
import Contacto from './pages/Contacto';
import Login from './pages/Login';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/productos" element={<PageTransition><Productos /></PageTransition>} />
            <Route path="/productos/:slug" element={<PageTransition><ProductDetail /></PageTransition>} />
            <Route path="/plan-multinivel" element={<PageTransition><Plan /></PageTransition>} />
            <Route path="/como-funciona" element={<PageTransition><ComoFunciona /></PageTransition>} />
            <Route path="/registro" element={<PageTransition><Registro /></PageTransition>} />
            <Route path="/testimonios" element={<PageTransition><Testimonios /></PageTransition>} />
            <Route path="/contacto" element={<PageTransition><Contacto /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
