// Ersätter lib/unsplash.js — identisk publik API

const KEYWORDS = [
  [['kyckling', 'kycklingfilé', 'kycklinglår', 'kycklingwing', 'hel kyckling'], 'kyckling'],
  [['kalkon'], 'kalkon'],
  [['oxfilé', 'biff', 'entrecôte', 'nötfärs', 'nötkött', 'oxkött', 'köttfärssås', 'bolognese'], 'biff'],
  [['hamburger', 'burgare'], 'hamburger'],
  [['köttbull', 'pannbiff', 'köttfärs', 'färsbiff', 'moussaka'], 'köttbullar'],
  [['fläsk', 'schnitzel', 'kotlett', 'bacon', 'skinka', 'kassler', 'karré', 'sidfläsk'], 'fläsk'],
  [['lamm', 'lammkotlett', 'lammgryta'], 'lamm'],
  [['revben', 'ribs', 'pulled'], 'revben'],
  [['korv', 'falukorv', 'prinskorv', 'bratwurst', 'grillkorv'], 'korv'],
  [['lax', 'gravlax', 'laxfilé'], 'lax'],
  [['torsk', 'fisk', 'sej', 'pangasius', 'abborre', 'gös', 'piggvar', 'rödspätta', 'sill', 'strömming', 'makrill', 'tonfisk'], 'fisk'],
  [['räk', 'skaldjur', 'hummer', 'kräfta', 'musslor', 'blåmussla'], 'räkor'],
  [['sushi', 'maki', 'nigiri'], 'sushi'],
  [['pasta', 'carbonara', 'spagetti', 'lasagne', 'tagliatelle', 'penne', 'fettuccine', 'gnocchi', 'ravioli', 'makaroner'], 'pasta'],
  [['risotto'], 'risotto'],
  [['ris', 'stekt ris', 'pilaf'], 'ris'],
  [['nudlar', 'ramen', 'udon', 'soba', 'pad thai', 'pho'], 'nudlar'],
  [['soppa', 'buljong', 'bisque', 'gazpacho', 'minestrone', 'borscht'], 'soppa'],
  [['gryta', 'kassoulet', 'boeuf', 'irish stew', 'gulash', 'stroganoff'], 'gryta'],
  [['chili', 'texmex'], 'chili'],
  [['curry', 'tikka', 'masala', 'dal', 'indisk', 'thai', 'korma', 'vindaloo'], 'curry'],
  [['pizza', 'focaccia', 'calzone'], 'pizza'],
  [['taco', 'nachos', 'quesadilla', 'enchilada', 'burrito', 'fajita'], 'tacos'],
  [['wrap', 'tortilla', 'kebab'], 'wrap'],
  [['paj', 'quiche', 'tarte', 'flambé'], 'paj'],
  [['sallad', 'caesar', 'coleslaw', 'tabouleh', 'nicoise'], 'sallad'],
  [['vegetarisk', 'vegansk', 'vegan', 'linser', 'tofu', 'böna', 'kikärt', 'hummus', 'falafel', 'halloumi'], 'vegetarisk'],
  [['aubergine', 'ratatouille', 'parmigiana', 'caponata'], 'aubergine'],
  [['svamp', 'champinjon', 'kantarell', 'karl johan', 'portobello'], 'svamp'],
  [['wok', 'stir fry', 'stir-fry'], 'wok'],
  [['asiatisk', 'kinesisk', 'vietnamesisk', 'koreansk', 'japansk', 'indonesisk', 'teriyaki', 'miso', 'gyoza', 'dumpling'], 'asiatisk'],
  [['ägg', 'omelett', 'scrambled', 'äggröra', 'frittata', 'shakshuka', 'Benedict'], 'ägg'],
  [['frukost', 'gröt', 'müsli', 'granola', 'yoghurt', 'smoothie bowl'], 'frukost'],
  [['toast', 'french toast', 'avokadotoast'], 'toast'],
  [['smörgås', 'macka', 'bruschetta', 'crostini', 'sandwich'], 'smörgås'],
  [['pannkaka', 'ugnspannkaka', 'crêpe', 'blini', 'våffla'], 'pannkaka'],
  [['grill', 'bbq', 'barbecue', 'rökt', 'spett'], 'grill'],
  [['bröd', 'fralla', 'baguette', 'surdeg', 'ciabatta', 'pitabröd', 'naan', 'bagel'], 'bröd'],
  [['kaka', 'muffin', 'brownie', 'cookie', 'kladdkaka', 'cheesecake', 'tårta', 'biskvi', 'hallongrotta'], 'kaka'],
  [['dessert', 'pudding', 'mousse', 'panna cotta', 'crème brûlée', 'tiramisu'], 'dessert'],
  [['glass', 'sorbet', 'gelato'], 'glass'],
]

const FALLBACK_IMAGES = {
  kyckling:   'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=800',
  kalkon:     'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=800',
  biff:       'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  hamburger:  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  köttbullar: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
  fläsk:      'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  lamm:       'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=800',
  revben:     'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  korv:       'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=800',
  lax:        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
  fisk:       'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
  räkor:      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
  sushi:      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
  pasta:      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  risotto:    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
  ris:        'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800',
  nudlar:     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  soppa:      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  gryta:      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
  chili:      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  curry:      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  pizza:      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  tacos:      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  wrap:       'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
  paj:        'https://images.unsplash.com/photo-1608835291093-394b0c943a75?w=800',
  sallad:     'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  vegetarisk: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  aubergine:  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800',
  svamp:      'https://images.unsplash.com/photo-1635265018783-0c8826e3af4e?w=800',
  wok:        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  asiatisk:   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ägg:        'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800',
  frukost:    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800',
  toast:      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  smörgås:    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800',
  pannkaka:   'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  grill:      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
  bröd:       'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800',
  kaka:       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  dessert:    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  glass:      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800',
  default:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
}

export function getFallbackImage(title = '') {
  const t = title.toLowerCase()
  for (const [keywords, category] of KEYWORDS) {
    if (keywords.some(kw => t.includes(kw))) {
      return FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.default
    }
  }
  return FALLBACK_IMAGES.default
}

export async function getRecipeImage(title) {
  if (!title) return getFallbackImage('')
  try {
    const res = await fetch('/api/image-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) return getFallbackImage(title)
    const { url } = await res.json()
    return url || getFallbackImage(title)
  } catch {
    return getFallbackImage(title)
  }
}
