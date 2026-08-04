import * as forge from 'node-forge';

import { ArcaConfigurationError } from './arca.errors';

/**
 * Signs the TRA as CMS/PKCS#7 SignedData, attached (not detached): WSAA
 * extracts the LoginTicketRequest XML from inside the signed message itself,
 * so the content must travel embedded rather than referenced separately.
 */
export function signLoginTicketRequest(
  traXml: string,
  certificatePem: string,
  privateKeyPem: string,
  passphrase?: string,
): string {
  let certificate: forge.pki.Certificate;
  let privateKey: forge.pki.rsa.PrivateKey | null;

  try {
    certificate = forge.pki.certificateFromPem(certificatePem);
    privateKey = passphrase
      ? forge.pki.decryptRsaPrivateKey(privateKeyPem, passphrase)
      : forge.pki.privateKeyFromPem(privateKeyPem);
  } catch {
    throw new ArcaConfigurationError(
      'No se pudo leer ARCA_CERTIFICATE/ARCA_PRIVATE_KEY (formato inválido).',
    );
  }

  if (!privateKey) {
    throw new ArcaConfigurationError(
      'No se pudo desencriptar ARCA_PRIVATE_KEY: revisar ARCA_PRIVATE_KEY_PASSPHRASE.',
    );
  }

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');
  p7.addCertificate(certificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      {
        type: forge.pki.oids.signingTime,
        value: new Date() as unknown as string,
      },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}
