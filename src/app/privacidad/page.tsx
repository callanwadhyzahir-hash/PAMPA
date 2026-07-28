import Link from "next/link";

export const metadata = {
  title: "Privacidad | PAMPA",
  description: "Política de privacidad de la lista de espera de PAMPA.",
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <main className="min-h-screen bg-[#0b0d0a] px-5 py-16 text-[#f2f1e8] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-[#b8e26b] underline underline-offset-4">Volver a PAMPA</Link>
        <p className="mt-12 font-mono text-xs uppercase tracking-[.16em] text-[#b8e26b]">Privacidad</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-.06em] sm:text-5xl">Lista de espera de PAMPA</h1>
        <div className="mt-10 space-y-8 text-base leading-8 text-[#a7aa9d]">
          <section><h2 className="text-xl font-medium text-[#f2f1e8]">Datos que recopilamos</h2><p className="mt-2">Al registrarte podemos recopilar nombre, correo electrónico, empresa y rol cuando los compartís, además de tu consentimiento para recibir novedades.</p></section>
          <section><h2 className="text-xl font-medium text-[#f2f1e8]">Para qué los usamos</h2><p className="mt-2">Usamos estos datos únicamente para administrar la lista de espera, compartir novedades de PAMPA y enviar futuras invitaciones a la beta. No vendemos tus datos.</p></section>
          <section><h2 className="text-xl font-medium text-[#f2f1e8]">Infraestructura</h2><p className="mt-2">La lista utiliza infraestructura de Supabase para almacenamiento y Resend para el envío de correos de confirmación.</p></section>
          <section><h2 className="text-xl font-medium text-[#f2f1e8]">Tus solicitudes</h2><p className="mt-2">Podés solicitar acceso, corrección o eliminación de tus datos escribiendo {contactEmail ? <a className="text-[#b8e26b] underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a> : "al correo de contacto publicado por PAMPA"}.</p></section>
          <section><h2 className="text-xl font-medium text-[#f2f1e8]">Actualizaciones</h2><p className="mt-2">Esta política puede actualizarse a medida que evolucione PAMPA. Publicaremos la versión vigente en esta página.</p></section>
        </div>
      </article>
    </main>
  );
}
