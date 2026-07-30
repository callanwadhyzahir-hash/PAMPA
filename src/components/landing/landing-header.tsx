"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "#producto", label: "Producto" },
  { href: "#modulos", label: "Módulos" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "#preguntas", label: "Preguntas" },
];

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-30 w-screen max-w-[100vw] border-b border-white/10 bg-[#0b0d0a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#inicio" className="text-lg font-semibold tracking-[-0.08em] text-[#f2f1e8]" onClick={closeMenu}>
          PAMPA<span className="text-[#b8e26b]">.</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          {links.map((link) => <a key={link.href} href={link.href} className="text-sm text-[#a7aa9d] transition-colors hover:text-[#f2f1e8]">{link.label}</a>)}
        </nav>
        <div className="hidden items-center gap-4 sm:flex">
          <a href="/login" className="text-sm text-[#a7aa9d] transition-colors hover:text-[#f2f1e8]">Iniciar sesión</a>
          <a href="#lista" className="border border-[#b8e26b] bg-[#b8e26b] px-4 py-2 text-sm font-semibold text-[#0b0d0a] transition-colors hover:bg-[#d2f58a]">Unirme a la beta</a>
        </div>
        <button type="button" className="landing-menu-toggle size-10 place-items-center text-[#f2f1e8]" aria-label={isOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={isOpen} aria-controls="mobile-navigation" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {isOpen && (
        <nav id="mobile-navigation" className="border-t border-white/10 bg-[#11140f] px-5 py-4 md:hidden" aria-label="Navegación móvil">
          <div className="mx-auto grid max-w-7xl gap-1">
            {links.map((link) => <a key={link.href} href={link.href} onClick={closeMenu} className="py-3 text-sm text-[#a7aa9d] hover:text-[#f2f1e8]">{link.label}</a>)}
            <a href="/login" onClick={closeMenu} className="py-3 text-sm text-[#f2f1e8]">Iniciar sesión</a>
            <a href="#lista" onClick={closeMenu} className="mt-2 bg-[#b8e26b] px-4 py-3 text-center text-sm font-semibold text-[#0b0d0a]">Unirme a la beta</a>
          </div>
        </nav>
      )}
    </header>
  );
}
