/**
 * Minimal i18n layer for the shell + key actions.
 *
 * Phase 1 ships English plus Hindi and Marathi for the navigation, the main actions
 * and the safety notices — the parts a first-time user needs. Longer explanations
 * inside the learning screens are still English-only; that is called out in Settings.
 *
 * ⚠️ Translations are AI-drafted and must be checked by a native speaker (and by a
 * deaf signer, since the terminology for signed languages is community specific).
 */
export type UiLanguage = 'en' | 'hi' | 'mr';

export const UI_LANGUAGES: Array<{ id: UiLanguage; label: string; native: string }> = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'mr', label: 'Marathi', native: 'मराठी' },
];

const en = {
  'app.name': 'SignBridge',
  'app.tagline': 'A two-way bridge between sign language and text',

  'nav.home': 'Home',
  'nav.textToSign': 'Text to Sign',
  'nav.demos': 'Demos',
  'nav.gallery': 'Handshapes',
  'nav.studio': 'Sign Studio',
  'nav.camera': 'Camera',
  'nav.settings': 'Settings',

  'player.face': 'Face',
  'player.view': 'View',
  'player.stop': 'Stop',
  'player.hideLabel': 'Hide face label',
  'player.showLabel': 'Show face label',
  'player.demoNotice': 'Demo motion — not verified by a deaf signer. Not a claim about correct ISL.',

  'demos.title': 'Demo animations',
  'demos.subtitle':
    'Ten motions that exercise the engine: one hand, two hands, face, head and the whole body. Every clip is a demo, not a lesson.',
  'demos.playAll': 'Play all',
  'demos.channels': 'Channels used',

  'gallery.title': 'Handshape gallery',
  'gallery.subtitle':
    'Every handshape is a set of finger joint angles. Palm orientation is a separate control, so the same shape can face any direction.',
  'gallery.rotate': 'Rotate the hand',
  'gallery.palm': 'Palm orientation',
  'gallery.all': 'All shapes',

  'common.play': 'Play',
  'common.pause': 'Pause',
  'common.replay': 'Replay',
  'common.speed': 'Speed',
  'common.loop': 'Loop',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.reset': 'Reset',
  'common.clear': 'Clear',
  'common.on': 'On',
  'common.off': 'Off',
  'common.phase': 'Phase 1',
  'common.comingSoon': 'Coming in a later phase',
  'common.skipToContent': 'Skip to main content',

  'home.title': 'Communication should flow both ways',
  'home.intro':
    'SignBridge turns typed text into an animated sign language avatar, and (in later phases) turns signs on camera into text. Sign language is not word-for-word speech: handshape, movement, facial expression and head movement all carry meaning, and this app animates all of them.',
  'home.cta.try': 'Try Text to Sign',
  'home.cta.camera': 'See the camera plan',
  'home.phaseTitle': 'What works today',
  'home.phaseBody':
    'Phase 1 is the foundation: a responsive app shell and an expressive 2D avatar that fingerspells A–Z and 0–9 with a full face. Vocabulary, camera recognition, conversation mode and offline support arrive in later phases.',
  'home.expressiveTitle': 'Built for the whole signer',
  'home.f1.title': 'Hands with 21 points',
  'home.f1.body': 'Every hand is a real 21-landmark rig: handshape, palm orientation, wrist rotation and finger curl.',
  'home.f2.title': 'Face carries grammar',
  'home.f2.body': 'Brows, eyes, cheeks and mouth change with the sentence type — questions and negation are visible.',
  'home.f3.title': 'Head, body and space',
  'home.f3.body': 'Nods, shakes, tilts, lean and where the hands are placed in signing space are all animated.',
  'home.f4.title': 'Private by design',
  'home.f4.body': 'The avatar runs entirely in your browser. In the camera phases all video stays on your device.',
  'home.roadmapTitle': 'Roadmap',
  'home.roadmapBody': 'Ten phases, from this avatar to sign recognition tested with deaf users.',

  'disclaimer.short':
    'This tool assists communication and may make mistakes. It does not replace a certified interpreter for medical, legal, or emergency use.',
  'disclaimer.title': 'Please read',

  't2s.title': 'Text to Sign',
  't2s.subtitle': 'Type a word or a short sentence and the avatar will sign it.',
  't2s.placeholder': 'Type a word or short sentence, e.g. Hello, or your name',
  't2s.sign': 'Sign it',
  't2s.expression': 'Facial expression',
  't2s.expressionAuto': 'Auto (from sentence)',
  't2s.autoMode': 'The expression follows the detected sentence type.',
  't2s.zoom': 'Face zoom',
  't2s.landmarks': 'Show 21 hand points',
  't2s.current': 'Now signing',
  't2s.letters': 'Fingerspell',
  't2s.empty': 'Type something to see it fingerspelled.',
  't2s.sentenceType': 'Sentence type',
  't2s.expressionLabel': 'What the face is doing',
  't2s.notInDict': 'not in the dictionary yet',
  't2s.fingerspelled': 'fingerspelled',
  't2s.preview': 'Phase 1 focuses on fingerspelling. Whole-word signs, grammar rules and sentences arrive in Phase 3.',

  'camera.title': 'Sign to Text',
  'camera.subtitle': 'Camera recognition arrives in Phase 4. Here is exactly how it will work.',
  'camera.privacy': 'Camera processing will run fully on your device. Nothing is uploaded unless you explicitly opt in.',
  'camera.test': 'Test my camera (local only)',
  'camera.stop': 'Stop camera',
  'camera.tipsTitle': 'Lighting and framing tips',
  'camera.scopeTitle': 'Recognition scope',
  'camera.scopeBody':
    'Version 1 recognises one-word signs and 3–4 word sentences from a fixed vocabulary — not free-form sentences. A defined phrase list keeps accuracy high.',

  'settings.title': 'Settings',
  'settings.subtitle': 'Everything here is stored on this device only.',
  'settings.language': 'Sign language',
  'settings.uiLanguage': 'App language',
  'settings.handedness': 'Signing hand',
  'settings.handedness.left': 'Left-handed',
  'settings.handedness.right': 'Right-handed',
  'settings.skinTone': 'Avatar skin tone',
  'settings.contrast': 'Contrast',
  'settings.contrast.default': 'Default',
  'settings.contrast.high': 'High contrast',
  'settings.motion': 'Reduce motion',
  'settings.speed': 'Avatar speed',
  'settings.avatar': 'Avatar',
  'settings.debug': 'Show 21 hand points (debug)',
  'settings.labels': 'Show expression labels',
  'settings.reset': 'Reset all settings',
  'settings.avatarStyle': 'Avatar style',
  'settings.avatarStyle.human': 'Simple human',
  'settings.avatarStyle.stick': 'Stick figure',
  'settings.outfit': 'Outfit colour',
  'settings.view': 'Default camera',
  'settings.transition': 'Sign-to-sign transition',
  'settings.overlay': 'Expression overlay',
  'settings.overlayWeight': 'Overlay strength',
  'settings.fps': 'Show FPS meter',
  'settings.motionBody':
    'Reduced motion stills the idle breathing and stops decorative animation. Signs still play when you press play.',
  'settings.privacyTitle': 'Privacy and data',
  'settings.privacyBody':
    'Phase 1 collects nothing. There is no analytics, no account and no upload. Video never leaves your device — the camera page only shows a local preview when you ask for it.',
  'settings.qualityTitle': 'Quality and review',
  'settings.qualityBody':
    'Every sign is marked draft, reviewed or supported. Draft signs are still waiting for a fluent deaf signer to check them, and accuracy per sign is reported before anything is marked supported.',
  'settings.disclaimerTitle': 'Safety notice',
  'settings.i18nNote': 'Some longer explanations are still English-only in Phase 1.',
  'settings.version': 'Version',
} as const;

export type MessageKey = keyof typeof en;

const hi: Partial<Record<MessageKey, string>> = {
  'app.tagline': 'सांकेतिक भाषा और लिखित पाठ के बीच दो-तरफ़ा पुल',
  'nav.home': 'मुख्य पृष्ठ',
  'nav.textToSign': 'पाठ से सांकेतिक',
  'nav.camera': 'कैमरा',
  'nav.settings': 'सेटिंग्स',
  'common.play': 'चलाएँ',
  'common.pause': 'रोकें',
  'common.replay': 'फिर चलाएँ',
  'common.speed': 'गति',
  'common.loop': 'दोहराएँ',
  'common.next': 'आगे',
  'common.previous': 'पीछे',
  'common.reset': 'रीसेट',
  'common.clear': 'साफ़ करें',
  'common.on': 'चालू',
  'common.off': 'बंद',
  'common.comingSoon': 'आगे के चरण में',
  'common.skipToContent': 'मुख्य सामग्री पर जाएँ',
  'home.title': 'बातचीत दोनों दिशाओं में होनी चाहिए',
  'home.cta.try': 'पाठ से सांकेतिक देखें',
  'home.phaseTitle': 'आज क्या काम करता है',
  'disclaimer.short':
    'यह उपकरण संवाद में सहायता करता है और ग़लतियाँ कर सकता है। चिकित्सा, कानूनी या आपातकालीन उपयोग के लिए यह प्रमाणित दुभाषिए का विकल्प नहीं है।',
  't2s.title': 'पाठ से सांकेतिक',
  't2s.subtitle': 'कोई शब्द या छोटा वाक्य लिखें, अवतार उसे सांकेतिक रूप में दिखाएगा।',
  't2s.placeholder': 'शब्द या छोटा वाक्य लिखें',
  't2s.sign': 'सांकेतिक करें',
  't2s.expression': 'चेहरे का भाव',
  't2s.zoom': 'चेहरा ज़ूम',
  'settings.title': 'सेटिंग्स',
  'settings.language': 'सांकेतिक भाषा',
  'settings.uiLanguage': 'ऐप की भाषा',
  'settings.motion': 'गति कम करें',
  'settings.contrast': 'कंट्रास्ट',
  'settings.privacyTitle': 'गोपनीयता और डेटा',
};

const mr: Partial<Record<MessageKey, string>> = {
  'app.tagline': 'सांकेतिक भाषा आणि लिखित मजकुरामधील दुहेरी दुवा',
  'nav.home': 'मुख्यपृष्ठ',
  'nav.textToSign': 'मजकूर ते सांकेतिक',
  'nav.camera': 'कॅमेरा',
  'nav.settings': 'सेटिंग्ज',
  'common.play': 'चालवा',
  'common.pause': 'थांबवा',
  'common.replay': 'पुन्हा चालवा',
  'common.speed': 'वेग',
  'common.loop': 'पुनरावृत्ती',
  'common.next': 'पुढे',
  'common.previous': 'मागे',
  'common.reset': 'रीसेट',
  'common.clear': 'साफ करा',
  'common.on': 'सुरू',
  'common.off': 'बंद',
  'common.comingSoon': 'पुढील टप्प्यात',
  'common.skipToContent': 'मुख्य मजकुराकडे जा',
  'home.title': 'संवाद दोन्ही दिशांनी व्हायला हवा',
  'home.cta.try': 'मजकूर ते सांकेतिक पहा',
  'home.phaseTitle': 'आज काय चालते',
  'disclaimer.short':
    'हे साधन संवादासाठी मदत करते आणि चुका करू शकते. वैद्यकीय, कायदेशीर किंवा आपत्कालीन वापरासाठी हे प्रमाणित दुभाष्याचा पर्याय नाही.',
  't2s.title': 'मजकूर ते सांकेतिक',
  't2s.subtitle': 'शब्द किंवा छोटे वाक्य लिहा, अवतार ते सांकेतिक स्वरूपात दाखवेल.',
  't2s.placeholder': 'शब्द किंवा छोटे वाक्य लिहा',
  't2s.sign': 'सांकेतिक करा',
  't2s.expression': 'चेहऱ्यावरील भाव',
  't2s.zoom': 'चेहरा झूम',
  'settings.title': 'सेटिंग्ज',
  'settings.language': 'सांकेतिक भाषा',
  'settings.uiLanguage': 'अ‍ॅपची भाषा',
  'settings.motion': 'हालचाल कमी करा',
  'settings.contrast': 'कॉन्ट्रास्ट',
  'settings.privacyTitle': 'गोपनीयता आणि डेटा',
};

const DICTIONARIES: Record<UiLanguage, Partial<Record<MessageKey, string>>> = { en, hi, mr };

/** Falls back to English whenever a translation is missing. */
export function translate(language: UiLanguage, key: MessageKey): string {
  return DICTIONARIES[language][key] ?? en[key];
}
