import Link from "next/link";

export const metadata = {
  title: "Privacidad | PAMPA",
  description: "Política de privacidad de PAMPA.",
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <main className="min-h-screen bg-void-black px-5 py-16 text-phosphor-white sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-body-sm text-lime-pulse underline underline-offset-4">Volver a PAMPA</Link>
        <p className="mt-12 font-mono text-caption uppercase tracking-[.16em] text-lime-pulse">Privacidad</p>
        <h1 className="mt-4 text-heading-lg tracking-[-0.02em]">Política de privacidad</h1>
        <div className="mt-10 space-y-8 text-body leading-8 text-sage-60">
          <section><h2 className="text-subheading font-medium text-phosphor-white">Datos que recopilamos</h2><p className="mt-2">Al crear tu cuenta recopilamos nombre, correo electrónico y datos de tu empresa (razón social, CUIT) necesarios para operar PAMPA.</p></section>
          <section><h2 className="text-subheading font-medium text-phosphor-white">Para qué los usamos</h2><p className="mt-2">Usamos estos datos para brindarte acceso a tu cuenta, operar tu empresa dentro de PAMPA y comunicarte novedades del servicio. No vendemos tus datos.</p></section>
          <section><h2 className="text-subheading font-medium text-phosphor-white">Infraestructura</h2><p className="mt-2">PAMPA utiliza infraestructura de Supabase para almacenamiento y Resend para el envío de correos transaccionales.</p></section>
          <section><h2 className="text-subheading font-medium text-phosphor-white">Tus solicitudes</h2><p className="mt-2">Podés solicitar acceso, corrección o eliminación de tus datos escribiendo {contactEmail ? <a className="text-lime-pulse underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a> : "al correo de contacto publicado por PAMPA"}.</p></section>
          <section><h2 className="text-subheading font-medium text-phosphor-white">Actualizaciones</h2><p className="mt-2">Esta política puede actualizarse a medida que evolucione PAMPA. Publicaremos la versión vigente en esta página.</p></section>
        </div>
      </article>
    </main>
  );
}
