export const metadata = {
  title: 'Användarvillkor — Mathandelsagenten',
  description: 'Villkor för användning av Mathandelsagenten.',
}

const sectionStyle = { marginBottom: '32px' }
const h2Style = { fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }
const pStyle = { fontSize: '15px', lineHeight: '1.75', color: 'var(--text-muted)', marginBottom: '10px' }
const liStyle = { fontSize: '15px', lineHeight: '1.75', color: 'var(--text-muted)', marginBottom: '4px' }

export default function VillkorPage() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
        Användarvillkor
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>
        Senast uppdaterad: 30 mars 2026
      </p>

      <div style={sectionStyle}>
        <h2 style={h2Style}>1. Om tjänsten</h2>
        <p style={pStyle}>
          Mathandelsagenten är en webbtjänst för matplanering, recepthantering och inköpslistor.
          Tjänsten använder AI (Claude av Anthropic) för att generera recept, menyförslag och prisuppskattningar.
          Genom att använda tjänsten godkänner du dessa villkor.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>2. Konto och åtkomst</h2>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}>Du måste vara minst 16 år för att skapa ett konto</li>
          <li style={liStyle}>Du ansvarar för att hålla dina inloggningsuppgifter säkra</li>
          <li style={liStyle}>Ett konto per person — du får inte dela konto med andra</li>
          <li style={liStyle}>Vi förbehåller oss rätten att stänga av konton som missbrukar tjänsten</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>3. Tillåten användning</h2>
        <p style={pStyle}>Du får använda tjänsten för:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}>Personlig och hushållsmässig matplanering</li>
          <li style={liStyle}>Att spara och dela recept</li>
          <li style={liStyle}>Att generera inköpslistor och hitta matpriser</li>
        </ul>
        <p style={{ ...pStyle, marginTop: '10px' }}>Du får <strong>inte</strong>:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}>Automatisera anrop till tjänsten (bots, scrapers)</li>
          <li style={liStyle}>Publicera stötande eller olagligt innehåll i delade recept</li>
          <li style={liStyle}>Försöka kringgå rate limiting eller säkerhetssystem</li>
          <li style={liStyle}>Använda tjänsten kommersiellt utan skriftligt tillstånd</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>4. AI-genererat innehåll</h2>
        <p style={pStyle}>
          Recept, menyförslag och prisuppskattningar genereras med hjälp av AI och är
          <strong> uppskattningar</strong> — inte garantier. Vi ansvarar inte för:
        </p>
        <ul style={{ paddingLeft: '20px' }}>
          <li style={liStyle}>Felaktiga allergiuppgifter i AI-genererade recept — kontrollera alltid ingredienser noga</li>
          <li style={liStyle}>Felaktiga prisuppskattningar — priser varierar och uppdateras inte i realtid</li>
          <li style={liStyle}>Näringsinformation — tjänsten beräknar inte näringsvärden medicinskt</li>
        </ul>
        <p style={{ ...pStyle, marginTop: '10px' }}>
          Dietist-chatfunktionen (om tillgänglig) är ett AI-verktyg och ersätter inte rådgivning
          från legitimerad dietist eller läkare.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>5. Ditt innehåll</h2>
        <p style={pStyle}>
          Du behåller äganderätten till recept och innehåll du skapar. Genom att publicera ett
          recept till det delade biblioteket ger du övriga användare rätt att se och spara det.
          Du ansvarar för att du har rätt att publicera innehållet.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>6. Tillgänglighet och ändringar</h2>
        <p style={pStyle}>
          Vi strävar efter hög tillgänglighet men garanterar inte 100% drifttid. Vi förbehåller
          oss rätten att ändra, pausa eller avsluta tjänsten med rimlig förvarning.
          Väsentliga ändringar av villkoren meddelas via e-post eller i appen.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>7. Ansvarsbegränsning</h2>
        <p style={pStyle}>
          Tjänsten tillhandahålls i befintligt skick. Vi ansvarar inte för indirekta skador,
          förlorade data eller avbrott i tjänsten. Vårt ansvar är begränsat till direkta skador
          och överstiger inte det du betalat för tjänsten under de senaste 12 månaderna.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>8. Tillämplig lag</h2>
        <p style={pStyle}>
          Dessa villkor lyder under svensk rätt. Tvister ska i första hand lösas i samförstånd,
          och i andra hand av svensk domstol med Stockholms tingsrätt som första instans.
        </p>
      </div>
    </div>
  )
}
