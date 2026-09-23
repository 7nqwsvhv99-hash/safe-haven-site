// Approved stories from families whose adoptions predate the shelter system.
// These do not create animal or adoption records in Airtable.
export const legacyAdoptionStories = [
  {
    id: "legacy-sylvester-and-milly",
    animalName: "Sylvester and Milly",
    quote: "Sylvester and Milly are doing well and getting along great. They spend their time playing and bird watching in the morning and napping in the afternoon, as you see in the picture. Sylvester is growing fast! We’re so happy that we adopted them.",
    image: "/images/adoption-stories/sylvester-and-milly.webp",
    personName: "",
    relationshipLabel: "Adoptive family",
    displayOrder: null,
  },
  {
    id: "legacy-walnut",
    animalName: "Walnut",
    quote: "From the bedroom eyes on lil Walternut (my weird nickname for him), I’d say we are doing just fine! Once he warmed up, he was the same little cuddle bug we met there. And there really wasn’t much training to be done with his claws! He’s naturally gentle with people, so when he plays, he doesn’t even take them out! He only scratches his own cat tree and cardboard scratchy posts, so we didn’t even need furniture protection! He did discover the joy of shredding toilet paper, so we keep that on lockdown, but it’s so funny, it’s impossible to be annoyed. 😆🤣 Thank you for trusting us to love him the way he deserves. He’s perfect. Walnut is a fantastic cat, and he’s home ‘furever.’ ♡",
    image: "/images/adoption-stories/walnut.webp",
    personName: "",
    relationshipLabel: "Adoptive family",
    displayOrder: null,
  },
  {
    id: "legacy-millie",
    animalName: "Millie",
    quote: "I can see why she was a fav! She’s so sweet and affectionate! She loves looking out the window and chasing a laser. She’s still not sure about going upstairs, but every morning when she hears me getting up, she waits at the bottom of the steps for me. She is definitely loved! Thanks again!",
    image: "/images/adoption-stories/millie.webp",
    personName: "",
    relationshipLabel: "Adoptive family",
    displayOrder: null,
  },
  {
    id: "legacy-chatty-kathy",
    animalName: "Chatty Kathy (now Lizzie)",
    quote: "Hello there! We have had Chatty Kathy (now Lizzie from Elizabeth) for about 6 months now! We love her dearly and she has brought a lot of light into our home. She has a new little brother who we found in the road.",
    image: "/images/adoption-stories/chatty-kathy.webp",
    personName: "",
    relationshipLabel: "Adoptive family",
    displayOrder: null,
  },
]

// Keep the existing Airtable stories in their configured order, placing one
// of the new cat stories before each existing dog story. Preserve any extras.
export function withLegacyAdoptionStories<T extends { animalName: string }>(stories: T[]) {
  const cats = [...legacyAdoptionStories]
  const legacyNames = new Set(cats.map((story) => story.animalName.toLowerCase()))
  const existing = stories.filter((story) => !legacyNames.has(story.animalName.toLowerCase()))
  const result: (T | (typeof legacyAdoptionStories)[number])[] = []
  for (let index = 0; index < Math.max(cats.length, existing.length); index++) {
    if (cats[index]) result.push(cats[index])
    if (existing[index]) result.push(existing[index])
  }
  return result
}
