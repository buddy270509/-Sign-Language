/** Shared avatar view types (kept out of the components so pages can import them cheaply). */
export type AvatarStyle = 'human' | 'stick';

/** Camera presets. All three keep the signing space reachable; they only change framing. */
export type AvatarView = 'full' | 'hands' | 'face';

export const AVATAR_VIEWS: Array<{ id: AvatarView; label: string; description: string }> = [
  { id: 'full', label: 'Full body', description: 'The whole signing space, waist to above the head.' },
  { id: 'hands', label: 'Hands', description: 'Zoomed on both hands — best for reading handshape detail.' },
  { id: 'face', label: 'Face', description: 'Zoomed on the face — best for non-manual markers.' },
];
