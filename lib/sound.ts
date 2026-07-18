export type SoundName = "pop" | "tick" | "alarm" | "notify" | "reveal" | "fanfare" | "spin-loop";

const cache = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    cache.set(name, audio);
  }
  return audio;
}

/** Toca um efeito uma vez. Rejeição por política de autoplay do navegador
 * vira silêncio, nunca um erro — mesmo espírito do `.catch(() => {})` já
 * usado em `toggleFullscreen` pelo projeto. */
export function playSound(name: SoundName, volume = 1): void {
  if (typeof window === "undefined") return;
  const audio = getAudio(name);
  audio.loop = false;
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

/** Toca um efeito em loop (ex: giro da roleta) até a função de parada
 * retornada ser chamada. */
export function startLoop(name: SoundName, volume = 1): () => void {
  if (typeof window === "undefined") return () => {};
  const audio = getAudio(name);
  audio.loop = true;
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
  return () => {
    audio.pause();
    audio.loop = false;
  };
}
