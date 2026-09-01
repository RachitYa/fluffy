export interface StickerItem {
  id: string;
  name: string;
  url: string;
  category: string;
}

export const STICKER_PACKS: { name: string; emoji: string; stickers: StickerItem[] }[] = [
  {
    name: 'Anime & Chibi',
    emoji: '✨',
    stickers: [
      { id: 'chibi_sparkle', name: 'Sparkle', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop', category: 'Anime' },
      { id: 'cat_happy', name: 'Happy Cat', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=150&auto=format&fit=crop', category: 'Anime' },
      { id: 'cat_cool', name: 'Cool Cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop', category: 'Anime' },
    ],
  },
  {
    name: 'Gaming & Cyber',
    emoji: '🎮',
    stickers: [
      { id: 'pixel_heart', name: 'Pixel Heart', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop', category: 'Gaming' },
      { id: 'retro_arcade', name: 'Arcade Win', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop', category: 'Gaming' },
    ],
  },
  {
    name: 'Reactions & Memes',
    emoji: '🔥',
    stickers: [
      { id: 'hype_fire', name: 'Hype Fire', url: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=150&auto=format&fit=crop', category: 'Reactions' },
      { id: 'party_popper', name: 'Celebration', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&auto=format&fit=crop', category: 'Reactions' },
    ],
  },
];
