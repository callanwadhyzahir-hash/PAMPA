export function LandingFooter() {
  return (
    <footer className="bg-ground-iron">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-10 text-body-sm sm:px-8 md:grid-cols-3">
        <div>
          <p className="font-display text-subheading font-medium tracking-[-0.02em] text-phosphor-white">
            PAMPA<span className="text-lime-pulse">.</span>
          </p>
          <p className="mt-2 text-sage-60">Gestión comercial para tu negocio</p>
        </div>
        <div className="text-sage-60">
          <p>pampa-erp.com</p>
          <a href="/privacidad" className="mt-2 inline-block text-fern-link underline underline-offset-4 hover:text-phosphor-white">
            Privacidad
          </a>
        </div>
        <div className="text-sage-60 md:text-right">
          <p>Hecho en Argentina</p>
          <p className="mt-5 font-mono text-caption text-deep-fern">© {new Date().getFullYear()} PAMPA</p>
        </div>
      </div>
    </footer>
  );
}
