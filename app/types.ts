export type Era = 'Showa' | 'Heisei' | 'Millennium' | 'Reiwa' | 'MonsterVerse'

export interface Godzilla {
  id: string
  name: string
  alias: string
  era: Era
  year: string
  height: string
  weight: string
  film: string
  /** Warna tubuh untuk gradient siluet */
  color: string
  /** Warna nyala sirip punggung & mata */
  glow: string
  /** Path gambar poster di public/images */
  image: string
  abilities: string[]
  description: string
}
