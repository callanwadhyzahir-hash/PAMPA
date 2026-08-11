"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "#producto", label: "Producto" },
  { href: "#funciones", label: "Funciones" },
  { href: "#operacion", label: "Operación" },
];

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-phosphor-blue-black bg-carbon-veil/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <a href="#inicio" className="flex items-center gap-2" onClick={closeMenu}>
          <span className="size-1.5 rounded-full bg-lime-pulse" aria-hidden="true" />
          <span className="font-display text-subheading font-medium tracking-[-0.02em] text-phosphor-white">PAMPA</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-body-sm text-sage-60 transition-colors duration-300 ease-out hover:text-phosphor-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 sm:flex">
          <a href="/login" className="text-body-sm text-sage-60 transition-colors duration-300 ease-out hover:text-phosphor-white">
            Iniciar sesión
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-lime-pulse px-4 py-2 text-body-sm font-medium text-void-black transition-colors duration-300 ease-out hover:bg-mint-frost"
          >
            Empezar con PAMPA
          </a>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center text-phosphor-white md:hidden"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen && (
        <nav id="mobile-navigation" className="border-t border-phosphor-blue-black bg-ground-iron px-5 py-4 md:hidden" aria-label="Navegación móvil">
          <div className="mx-auto grid max-w-[1280px] gap-1">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={closeMenu} className="py-3 text-body-sm text-sage-60 hover:text-phosphor-white">
                {link.label}
              </a>
            ))}
            <a href="/login" onClick={closeMenu} className="py-3 text-body-sm text-phosphor-white">
              Iniciar sesión
            </a>
            <a href="/register" onClick={closeMenu} className="mt-2 rounded-full bg-lime-pulse px-4 py-3 text-center text-body-sm font-medium text-void-black">
              Empezar con PAMPA
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
