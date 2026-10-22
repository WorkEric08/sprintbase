import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './platform';

/**
 * Entrega um arquivo de texto ao usuário.
 *  - APK: grava na pasta de cache do app e abre a folha de compartilhar do Android
 *    (Drive, WhatsApp, e-mail, "Salvar em"...). O arquivo não fica solto no aparelho.
 *  - Web/PWA: baixa pelo navegador.
 *
 * Retorna `false` se o usuário cancelou a folha de compartilhar (não é erro).
 */
export async function saveTextFile(fileName: string, text: string, dialogTitle: string): Promise<boolean> {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: fileName, dialogTitle, url: uri });
    } catch (e) {
      if (/cancel/i.test(e instanceof Error ? e.message : String(e))) return false;
      throw e;
    }
    return true;
  }

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
