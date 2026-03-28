import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { prompt } = await request.json()

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `Du är en hjälpsam matplaneringsassistent. 
      Du hjälper familjer att planera veckomeny, hitta recept och skapa 
inköpslistor. 
      Svara alltid på svenska. 
      När du föreslår recept, inkludera alltid ingredienser med mängder 
och enkla instruktioner.
      När du föreslår inköpslistor, gruppera varor per butikskategori 
(frukt & grönt, mejeri, kött, torrvaror etc).`,
    })

    return Response.json({
      success: true,
      content: message.content[0].text,
    })
  } catch (error) {
    console.error('AI error:', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
