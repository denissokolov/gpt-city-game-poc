export type AvatarStyle =
  | 'adventurer'
  | 'adventurer-neutral'
  | 'avataaars'
  | 'big-ears'
  | 'big-smile'
  | 'bottts'
  | 'croodles'
  | 'fun-emoji'
  | 'lorelei'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art'
  | 'thumbs'

export const PLAYER_AVATAR_STYLES: AvatarStyle[] = [
  'adventurer',
  'avataaars',
  'big-smile',
  'lorelei',
  'micah',
  'notionists',
  'open-peeps',
  'personas',
  'pixel-art',
  'thumbs',
]

export function avatarUrl(style: AvatarStyle, seed: string, size = 128): string {
  const safeSeed = encodeURIComponent(seed || 'player')
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&size=${size}&radius=50&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function npcAvatarUrl(character: {
  id: string
  firstName: string
  lastName: string
  sex: 'male' | 'female' | 'non_binary'
}): string {
  const seed = `${character.firstName}-${character.lastName}-${character.id.slice(0, 6)}`
  const style: AvatarStyle =
    character.sex === 'non_binary' ? 'notionists' : 'lorelei'
  return avatarUrl(style, seed, 128)
}
